const prisma = require("../prismaClient");
const { calculateEqualShares } = require("../services/splitCalculator");
const { round2 } = require("../services/balanceEngine");

const CATEGORIES = [
  "Rent",
  "Electricity",
  "Water",
  "WiFi",
  "Grocery",
  "Kitchen",
  "Gas",
  "Cleaning",
  "Snacks",
  "Dining Out",
  "Furniture",
  "Travel",
  "Other",
];

function serializeExpense(expense) {
  return {
    id: expense.id,
    title: expense.title,
    amount: Number(expense.amount),
    category: expense.category,
    date: expense.date,
    note: expense.note,
    receiptUrl: expense.receiptUrl || null,
    paidBy: {
      id: expense.payer.id,
      name: expense.payer.name,
    },
    shares: expense.shares.map((s) => ({
      memberId: s.memberId,
      name: s.member.name,
      shareAmount: Number(s.shareAmount),
    })),
  };
}

// Loads a room the current user must be a member of, or throws a
// request-shaped error the errorHandler can render directly.
async function loadMembership(roomId, userId) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { members: { select: { userId: true } } },
  });

  if (!room) {
    const err = new Error("Room not found.");
    err.status = 404;
    throw err;
  }

  const isMember = room.members.some((m) => m.userId === userId);
  if (!isMember) {
    const err = new Error("You're not a member of this room.");
    err.status = 403;
    throw err;
  }

  return room;
}

// POST /api/rooms/:id/expenses
async function createExpense(req, res, next) {
  try {
    const roomId = req.params.id;
    const room = await loadMembership(roomId, req.user.id);

    const { title, amount, category, paidBy, date, note, splitWith, memberIds, receiptUrl, computedShares } = req.body;

    const roomMemberIds = room.members.map((m) => m.userId);

    if (!roomMemberIds.includes(paidBy)) {
      return res.status(400).json({ error: "The payer must be a member of this room." });
    }

    const numericAmount = Math.round(Number(amount) * 100) / 100;
    
    let shares = [];
    if (computedShares && Array.isArray(computedShares) && computedShares.length > 0) {
      let sum = 0;
      for (const s of computedShares) {
        if (!roomMemberIds.includes(s.memberId)) {
          return res.status(400).json({ error: "A share belongs to a non-member." });
        }
        sum += Number(s.shareAmount);
      }
      if (Math.abs(sum - numericAmount) > 0.05) {
        return res.status(400).json({ error: "Shares do not sum up to the total amount." });
      }
      shares = computedShares.map(s => ({ memberId: s.memberId, shareAmount: Number(s.shareAmount) }));
    } else {
      let includedMemberIds;
      if (splitWith === "custom") {
        if (!Array.isArray(memberIds) || memberIds.length === 0) {
          return res.status(400).json({ error: "Pick at least one member to split with." });
        }
        const invalid = memberIds.filter((id) => !roomMemberIds.includes(id));
        if (invalid.length > 0) {
          return res.status(400).json({ error: "One or more selected members aren't in this room." });
        }
        includedMemberIds = memberIds;
      } else {
        includedMemberIds = roomMemberIds;
      }
      shares = calculateEqualShares(numericAmount, includedMemberIds);
    }

    // Only accept URLs our own upload endpoint produced — never trust an
    // arbitrary client-supplied URL here.
    const safeReceiptUrl =
      typeof receiptUrl === "string" && receiptUrl.startsWith("/uploads/receipts/")
        ? receiptUrl
        : null;

    const expense = await prisma.expense.create({
      data: {
        roomId,
        title,
        amount: numericAmount,
        category,
        paidBy,
        date: date ? new Date(date) : new Date(),
        note: note || null,
        receiptUrl: safeReceiptUrl,
        shares: {
          create: shares.map((s) => ({ memberId: s.memberId, shareAmount: s.shareAmount })),
        },
      },
      include: {
        payer: { select: { id: true, name: true } },
        shares: { include: { member: { select: { name: true } } } },
      },
    });

    res.status(201).json({ expense: serializeExpense(expense) });
  } catch (err) {
    next(err);
  }
}

// GET /api/rooms/:id/expenses?limit=10&keyword=milk&from=2026-08-01&to=2026-08-31&payer=<userId>
async function listExpenses(req, res, next) {
  try {
    const roomId = req.params.id;
    await loadMembership(roomId, req.user.id);

    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const { keyword, from, to, payer } = req.query;

    const where = { roomId };

    if (keyword) {
      where.title = { contains: keyword, mode: "insensitive" };
    }
    if (payer) {
      where.OR = [
        { paidBy: payer },
        { shares: { some: { memberId: payer } } },
      ];
    }
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) {
        // Include the whole "to" day, not just its midnight.
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit,
      include: {
        payer: { select: { id: true, name: true } },
        shares: { include: { member: { select: { name: true } } } },
      },
    });

    // Only show expenses to members involved in the expense (payer or share participant) for privacy.
    const visibleExpenses = expenses.filter((e) =>
      e.paidBy === req.user.id || e.shares.some((s) => s.memberId === req.user.id)
    );

    res.json({ expenses: visibleExpenses.map(serializeExpense) });
  } catch (err) {
    next(err);
  }
}

// GET /api/rooms/:id/dashboard
// Totals + balance summary + analytics + recent feed, all in one call so
// the room page loads with a single request.
async function getDashboard(req, res, next) {
  try {
    // Imported lazily to avoid a require-cycle at module load time
    // (settlement.controller also depends on this file's neighbors).
    const { getBalancesAndSuggestions } = require("./settlement.controller");

    const roomId = req.params.id;
    const room = await loadMembership(roomId, req.user.id);

    const allExpenses = await prisma.expense.findMany({
      where: { roomId },
      orderBy: { date: "desc" },
      include: {
        payer: { select: { id: true, name: true } },
        shares: { include: { member: { select: { name: true } } } },
      },
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const membersWithNames = await prisma.roomMember.findMany({
      where: { roomId },
      include: { user: { select: { id: true, name: true } } },
    });

    const thisMonthExpenses = allExpenses.filter((e) => e.date >= startOfMonth);

    // Shared group expenses are expenses split between 2 or more room members.
    // Individual/personal expenses (shares.length === 1) are excluded from the group room total.
    const sharedThisMonthExpenses = thisMonthExpenses.filter((e) => e.shares.length > 1);
    const totalThisMonth = sharedThisMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // "Your spend this month": the user's allocated share of expenses logged this month (both shared and individual).
    // This immediately includes their share when an expense is split, regardless of settlement status.
    const myContributionThisMonth = thisMonthExpenses.reduce((sum, e) => {
      const share = e.shares.find((s) => s.memberId === req.user.id);
      return sum + (share ? Number(share.shareAmount) : 0);
    }, 0);

    // Balances — single source of truth shared with the Settle Up tab,
    // so "you owe ₹X" here always matches what Settle Up suggests.
    const { suggestions } = await getBalancesAndSuggestions(roomId);
    const myOwed = suggestions.filter((s) => s.from === req.user.id);
    const myOwedTo = suggestions.filter((s) => s.to === req.user.id);
    const youOwe = round2(myOwed.reduce((sum, s) => sum + s.amount, 0));
    const youAreOwed = round2(myOwedTo.reduce((sum, s) => sum + s.amount, 0));
    const breakdown = [
      ...myOwed.map((s) => ({ memberId: s.to, name: s.toName, amount: s.amount, direction: "owe" })),
      ...myOwedTo.map((s) => ({ memberId: s.from, name: s.fromName, amount: s.amount, direction: "owed" })),
    ];

    // Category-wise breakdown, this month — feeds the pie chart for shared group expenses.
    const categoryBreakdown = {};
    for (const e of sharedThisMonthExpenses) {
      categoryBreakdown[e.category] = round2((categoryBreakdown[e.category] || 0) + Number(e.amount));
    }

    // Monthly spending trend — last 6 months, oldest first (shared group expenses).
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() - i, 1);
      const nextMonthDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
      const total = allExpenses
        .filter((e) => e.shares.length > 1 && e.date >= monthDate && e.date < nextMonthDate)
        .reduce((sum, e) => sum + Number(e.amount), 0);
      monthlyTrend.push({
        month: monthDate.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        total: round2(total),
      });
    }

    // Member-wise spend breakdown, this month — each member's total allocated share of expenses.
    const memberContribution = membersWithNames.map((m) => {
      const memberShareTotal = thisMonthExpenses.reduce((sum, e) => {
        const share = e.shares.find((s) => s.memberId === m.user.id);
        return sum + (share ? Number(share.shareAmount) : 0);
      }, 0);
      return {
        id: m.user.id,
        name: m.user.name,
        total: round2(memberShareTotal),
      };
    });

    // Daily spending trend, this month — feeds a small sparkline/line chart for shared group expenses.
    const daysSoFar = new Date().getDate();
    const dailyTrend = Array.from({ length: daysSoFar }, (_, i) => {
      const day = i + 1;
      const total = sharedThisMonthExpenses
        .filter((e) => e.date.getDate() === day)
        .reduce((sum, e) => sum + Number(e.amount), 0);
      return { day, total: round2(total) };
    });

    // Filter recent expenses visible to current user (only expenses where user is payer or share member)
    const visibleRecentExpenses = allExpenses.filter((e) =>
      e.paidBy === req.user.id || e.shares.some((s) => s.memberId === req.user.id)
    );

    res.json({
      totalThisMonth: round2(totalThisMonth),
      myContributionThisMonth: round2(myContributionThisMonth),
      youOwe,
      youAreOwed,
      breakdown,
      categoryBreakdown,
      monthlyTrend,
      memberContribution,
      dailyTrend,
      recentExpenses: visibleRecentExpenses.slice(0, 10).map(serializeExpense),
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/rooms/:id/expenses/:expenseId
async function updateExpense(req, res, next) {
  try {
    const { id: roomId, expenseId } = req.params;
    await loadMembership(roomId, req.user.id);

    const { title, amount, category, paidBy, date, note, splitWith, memberIds, receiptUrl, computedShares } = req.body;

    const existing = await prisma.expense.findFirst({
      where: { id: expenseId, roomId }
    });
    if (!existing) {
      return res.status(404).json({ error: "Expense not found" });
    }

    const room = await prisma.room.findUnique({ where: { id: roomId }, include: { members: true } });
    const roomMemberIds = room.members.map((m) => m.userId);

    if (paidBy && !roomMemberIds.includes(paidBy)) {
      return res.status(400).json({ error: "The payer must be a member of this room." });
    }

    const numericAmount = amount !== undefined ? Math.round(Number(amount) * 100) / 100 : Number(existing.amount);

    let finalShares = [];
    if (computedShares && Array.isArray(computedShares) && computedShares.length > 0) {
      let sum = 0;
      for (const s of computedShares) {
        if (!roomMemberIds.includes(s.memberId)) {
          return res.status(400).json({ error: "A share belongs to a non-member." });
        }
        sum += Number(s.shareAmount);
      }
      if (Math.abs(sum - numericAmount) > 0.05) {
        return res.status(400).json({ error: "Shares do not sum up to the total amount." });
      }
      finalShares = computedShares.map(s => ({ memberId: s.memberId, shareAmount: Number(s.shareAmount) }));
    } else if (memberIds || splitWith === "all") {
      let includedMemberIds = roomMemberIds;
      if (splitWith === "custom" || memberIds) {
        const idsToCheck = memberIds || roomMemberIds;
        const invalid = idsToCheck.filter((id) => !roomMemberIds.includes(id));
        if (invalid.length > 0) return res.status(400).json({ error: "One or more selected members aren't in this room." });
        includedMemberIds = idsToCheck;
      }
      finalShares = calculateEqualShares(numericAmount, includedMemberIds);
    }

    const safeReceiptUrl =
      typeof receiptUrl === "string" && receiptUrl.startsWith("/uploads/receipts/")
        ? receiptUrl
        : undefined;

    const updateData = {
      title: title !== undefined ? title : undefined,
      amount: amount !== undefined ? numericAmount : undefined,
      category: category !== undefined ? category : undefined,
      paidBy: paidBy !== undefined ? paidBy : undefined,
      date: date ? new Date(date) : undefined,
      note: note !== undefined ? note : undefined,
    };
    if (safeReceiptUrl !== undefined) updateData.receiptUrl = safeReceiptUrl;

    if (finalShares.length > 0) {
      updateData.shares = {
        deleteMany: {},
        create: finalShares,
      };
    }

    const expense = await prisma.expense.update({
      where: { id: expenseId },
      data: updateData,
      include: {
        payer: { select: { id: true, name: true } },
        shares: { include: { member: { select: { name: true } } } },
      },
    });

    res.json({ expense: serializeExpense(expense) });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/rooms/:id/expenses/:expenseId
async function deleteExpense(req, res, next) {
  try {
    const { id: roomId, expenseId } = req.params;
    await loadMembership(roomId, req.user.id);

    const existing = await prisma.expense.findFirst({
      where: { id: expenseId, roomId }
    });
    if (!existing) {
      return res.status(404).json({ error: "Expense not found" });
    }

    await prisma.expense.delete({
      where: { id: expenseId }
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { createExpense, listExpenses, getDashboard, updateExpense, deleteExpense, CATEGORIES };

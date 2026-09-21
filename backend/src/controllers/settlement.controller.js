const prisma = require("../prismaClient");
const { computeOverallBalances } = require("../services/balanceEngine");
const { simplifyDebts } = require("../services/debtSimplifier");

// Loads a room the current user must be a member of.
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

async function getBalancesAndSuggestions(roomId) {
  const members = await prisma.roomMember.findMany({
    where: { roomId },
    include: { user: { select: { id: true, name: true, upiId: true, phoneNumber: true } } },
  });
  const memberIdsList = members.map((m) => m.user.id);
  const memberIds = new Set(memberIdsList);

  const [expenses, allSettlements] = await Promise.all([
    prisma.expense.findMany({ where: { roomId }, include: { shares: true } }),
    prisma.settlement.findMany({
      where: { payer: { in: memberIdsList }, receiver: { in: memberIdsList } },
      orderBy: { date: "desc" },
    }),
  ]);
  
  const roomSettlements = allSettlements.filter(
    (s) => s.status === "settled" && memberIds.has(s.payer) && memberIds.has(s.receiver)
  );

  const pendingSettlements = allSettlements.filter(
    (s) => s.status === "pending" && memberIds.has(s.payer) && memberIds.has(s.receiver)
  );

  const forEngine = expenses.map((e) => ({
    paidBy: e.paidBy,
    amount: Number(e.amount),
    shares: e.shares.map((s) => ({ memberId: s.memberId, shareAmount: Number(s.shareAmount) })),
  }));

  const settledForEngine = roomSettlements.map((s) => ({
    payer: s.payer,
    receiver: s.receiver,
    amount: Number(s.amount),
  }));

  const netBalances = computeOverallBalances(forEngine, settledForEngine);
  const suggestions = simplifyDebts(netBalances);

  const nameById = Object.fromEntries(members.map((m) => [m.user.id, m.user.name]));
  const upiById = Object.fromEntries(members.map((m) => [m.user.id, m.user.upiId]));
  const phoneById = Object.fromEntries(members.map((m) => [m.user.id, m.user.phoneNumber]));

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const formattedSuggestions = suggestions.map((s) => {
    // Check if debtor (from) owes on any expense created by creditor (to) > 7 days ago
    const oldestDebtExpense = expenses.find((e) => {
      if (e.paidBy !== s.to) return false;
      const sharesWithFrom = e.shares.some((sh) => sh.memberId === s.from && Number(sh.shareAmount) > 0);
      if (!sharesWithFrom) return false;
      return now - new Date(e.date).getTime() > SEVEN_DAYS_MS;
    });

    return {
      ...s,
      fromName: nameById[s.from] || "Unknown",
      toName: nameById[s.to] || "Unknown",
      toUpiId: upiById[s.to] || null,
      toPhoneNumber: phoneById[s.to] || null,
      fromPhoneNumber: phoneById[s.from] || null,
      isOverdue: !!oldestDebtExpense,
    };
  });

  const allMessages = allSettlements
    .filter((s) => memberIds.has(s.payer) && memberIds.has(s.receiver))
    .map((s) => ({
      ...s,
      id: s.id,
      amount: Number(s.amount),
      payer: s.payer,
      receiver: s.receiver,
      fromName: nameById[s.payer] || "Unknown",
      toName: nameById[s.receiver] || "Unknown",
      paymentMethod: s.paymentMethod || "Cash",
      status: s.status,
      date: s.date,
    }));

  return {
    netBalances,
    suggestions: formattedSuggestions,
    pendingSettlements: pendingSettlements.map((s) => ({
      ...s,
      id: s.id,
      amount: Number(s.amount),
      fromName: nameById[s.payer] || "Unknown",
      toName: nameById[s.receiver] || "Unknown",
      paymentMethod: s.paymentMethod || "Cash",
    })),
    allMessages,
    nameById,
  };
}

// GET /api/rooms/:id/settlements/suggestions
// The minimized set of payments that would settle the whole room up.
async function getSuggestions(req, res, next) {
  try {
    const roomId = req.params.id;
    await loadMembership(roomId, req.user.id);

    const { suggestions, pendingSettlements, allMessages } = await getBalancesAndSuggestions(roomId);
    res.json({ suggestions, pendingSettlements, allMessages });
  } catch (err) {
    next(err);
  }
}

// GET /api/rooms/:id/settlements
// History of settlements already logged for this room's members.
async function listSettlements(req, res, next) {
  try {
    const roomId = req.params.id;
    const room = await loadMembership(roomId, req.user.id);
    const memberIds = room.members.map((m) => m.userId);

    const settlements = await prisma.settlement.findMany({
      where: { payer: { in: memberIds }, receiver: { in: memberIds } },
      include: {
        payerUser: { select: { id: true, name: true } },
        receiverUser: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    });

    res.json({
      settlements: settlements.map((s) => ({
        id: s.id,
        amount: Number(s.amount),
        date: s.date,
        status: s.status,
        paymentMethod: s.paymentMethod || "Cash",
        payer: { id: s.payerUser.id, name: s.payerUser.name },
        receiver: { id: s.receiverUser.id, name: s.receiverUser.name },
      })),
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/rooms/:id/settlements
// Logs a payment or confirms a pending settlement notification.
async function createSettlement(req, res, next) {
  try {
    const roomId = req.params.id;
    const room = await loadMembership(roomId, req.user.id);
    const memberIds = room.members.map((m) => m.userId);

    const { payer, receiver, amount, status = "settled", paymentMethod, pendingId } = req.body;

    if (!memberIds.includes(payer) || !memberIds.includes(receiver)) {
      return res.status(400).json({ error: "Both payer and receiver must be members of this room." });
    }
    if (payer === receiver) {
      return res.status(400).json({ error: "Payer and receiver must be different people." });
    }
    if (!(Number(amount) > 0)) {
      return res.status(400).json({ error: "Amount must be greater than zero." });
    }

    if (status === "pending" && req.user.id !== payer) {
      return res.status(403).json({ error: "Only the payer can notify that they've paid." });
    }

    let settlement;
    let targetPending = null;

    if (pendingId) {
      targetPending = await prisma.settlement.findUnique({ where: { id: pendingId } });
    }
    if (!targetPending && status === "settled") {
      targetPending = await prisma.settlement.findFirst({
        where: { payer, receiver, status: "pending" },
        orderBy: { date: "desc" },
      });
    }

    if (targetPending) {
      // Update existing pending notification message to settled instead of deleting it
      settlement = await prisma.settlement.update({
        where: { id: targetPending.id },
        data: {
          status,
          amount,
          paymentMethod: paymentMethod || targetPending.paymentMethod || "Cash",
        },
        include: {
          payerUser: { select: { id: true, name: true } },
          receiverUser: { select: { id: true, name: true } },
        },
      });
    } else {
      // Create new settlement message record
      settlement = await prisma.settlement.create({
        data: { payer, receiver, amount, status, paymentMethod: paymentMethod || "Cash" },
        include: {
          payerUser: { select: { id: true, name: true } },
          receiverUser: { select: { id: true, name: true } },
        },
      });
    }

    res.status(201).json({
      settlement: {
        id: settlement.id,
        amount: Number(settlement.amount),
        date: settlement.date,
        status: settlement.status,
        payer: { id: settlement.payerUser.id, name: settlement.payerUser.name },
        receiver: { id: settlement.receiverUser.id, name: settlement.receiverUser.name },
      },
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/rooms/:id/settlements/:settlementId or /pending/:settlementId
// Allows any room member to delete ANY payment notification message (pending OR settled)
// at any time if amounts shift, debt is simplified, or a message/record was created by mistake.
async function deletePendingSettlement(req, res, next) {
  try {
    const { id: roomId, settlementId } = req.params;
    await loadMembership(roomId, req.user.id);

    const existing = await prisma.settlement.findUnique({
      where: { id: settlementId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Settlement message not found." });
    }

    await prisma.settlement.delete({
      where: { id: settlementId },
    });

    res.json({ success: true, message: "Payment message deleted successfully." });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/rooms/:id/settlements/:settlementId
// Allows updating payment method (e.g. switching between UPI and Cash) for corrections
async function updateSettlementMethod(req, res, next) {
  try {
    const { id: roomId, settlementId } = req.params;
    await loadMembership(roomId, req.user.id);
    const { paymentMethod } = req.body;

    const existing = await prisma.settlement.findUnique({
      where: { id: settlementId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Settlement message not found." });
    }

    const updated = await prisma.settlement.update({
      where: { id: settlementId },
      data: { paymentMethod: paymentMethod || "Cash" },
    });

    res.json({ success: true, settlement: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSuggestions,
  listSettlements,
  createSettlement,
  deletePendingSettlement,
  updateSettlementMethod,
  getBalancesAndSuggestions,
  loadMembership,
};

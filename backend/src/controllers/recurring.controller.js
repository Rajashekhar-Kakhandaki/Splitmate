const prisma = require("../prismaClient");
const { calculateEqualShares } = require("../services/splitCalculator");

const CATEGORIES = [
  "Rent", "Electricity", "Water", "WiFi", "Grocery",
  "Kitchen", "Gas", "Cleaning", "Snacks", "Dining Out", "Furniture", "Travel", "Other",
];

/** Verify the user is a member of the room; throw a shaped error if not. */
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
  if (!room.members.some((m) => m.userId === userId)) {
    const err = new Error("You're not a member of this room.");
    err.status = 403;
    throw err;
  }
  return room;
}

/** Advance a due-date by one cycle */
function advanceDueDate(date, frequency) {
  const next = new Date(date);
  if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
  } else {
    // monthly — same day next month
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

function serializeRecurring(r) {
  return {
    id: r.id,
    title: r.title,
    amount: Number(r.amount),
    category: r.category,
    frequency: r.frequency,
    nextDueDate: r.nextDueDate,
    splitWith: r.splitWith,
    splitMemberIds: r.splitMemberIds,
    note: r.note,
    paidBy: { id: r.payer.id, name: r.payer.name },
  };
}

// GET /api/rooms/:id/recurring
async function listRecurring(req, res, next) {
  try {
    const roomId = req.params.id;
    await loadMembership(roomId, req.user.id);

    const items = await prisma.recurringExpense.findMany({
      where: { roomId },
      orderBy: { nextDueDate: "asc" },
      include: { payer: { select: { id: true, name: true } } },
    });

    res.json({ recurring: items.map(serializeRecurring) });
  } catch (err) {
    next(err);
  }
}

// POST /api/rooms/:id/recurring
async function createRecurring(req, res, next) {
  try {
    const roomId = req.params.id;
    const room = await loadMembership(roomId, req.user.id);

    const { title, amount, category, paidBy, frequency, nextDueDate, note, splitWith, memberIds } = req.body;

    const roomMemberIds = room.members.map((m) => m.userId);

    if (!roomMemberIds.includes(paidBy)) {
      return res.status(400).json({ error: "Payer must be a member of this room." });
    }

    // Resolve who to split with
    let splitMemberIds = [];
    const resolvedSplitWith = splitWith === "custom" ? "custom" : "all";

    if (resolvedSplitWith === "custom") {
      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({ error: "Pick at least one member to split with." });
      }
      const invalid = memberIds.filter((id) => !roomMemberIds.includes(id));
      if (invalid.length > 0) {
        return res.status(400).json({ error: "One or more selected members aren't in this room." });
      }
      splitMemberIds = memberIds;
    }
    // "all" → splitMemberIds stays empty (resolved at apply-time from current room members)

    const item = await prisma.recurringExpense.create({
      data: {
        roomId,
        title,
        amount: Math.round(Number(amount) * 100) / 100,
        category,
        paidBy,
        frequency,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : new Date(),
        splitWith: resolvedSplitWith,
        splitMemberIds,
        note: note || null,
      },
      include: { payer: { select: { id: true, name: true } } },
    });

    res.status(201).json({ recurring: serializeRecurring(item) });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/rooms/:id/recurring/:rid
async function deleteRecurring(req, res, next) {
  try {
    const { id: roomId, rid } = req.params;
    await loadMembership(roomId, req.user.id);

    const item = await prisma.recurringExpense.findFirst({ where: { id: rid, roomId } });
    if (!item) return res.status(404).json({ error: "Recurring expense not found." });

    await prisma.recurringExpense.delete({ where: { id: rid } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// POST /api/rooms/:id/recurring/:rid/apply
// Creates an actual Expense from the template and advances nextDueDate.
async function applyRecurring(req, res, next) {
  try {
    const { id: roomId, rid } = req.params;
    const room = await loadMembership(roomId, req.user.id);

    const template = await prisma.recurringExpense.findFirst({ where: { id: rid, roomId } });
    if (!template) return res.status(404).json({ error: "Recurring expense not found." });

    // Resolve which member IDs to split with
    const allMemberIds = room.members.map((m) => m.userId);
    const includedMemberIds =
      template.splitWith === "custom" && template.splitMemberIds.length > 0
        ? template.splitMemberIds.filter((id) => allMemberIds.includes(id)) // guard against members who left
        : allMemberIds;

    if (includedMemberIds.length === 0) {
      return res.status(400).json({ error: "No valid members to split with. Please edit the recurring expense." });
    }

    const shares = calculateEqualShares(Number(template.amount), includedMemberIds);

    const [expense] = await prisma.$transaction([
      prisma.expense.create({
        data: {
          roomId,
          title: template.title,
          amount: template.amount,
          category: template.category,
          paidBy: template.paidBy,
          date: new Date(),
          note: template.note,
          shares: {
            create: shares.map((s) => ({ memberId: s.memberId, shareAmount: s.shareAmount })),
          },
        },
      }),
      prisma.recurringExpense.update({
        where: { id: rid },
        data: { nextDueDate: advanceDueDate(template.nextDueDate, template.frequency) },
      }),
    ]);

    res.status(201).json({ expenseId: expense.id });
  } catch (err) {
    next(err);
  }
}

module.exports = { listRecurring, createRecurring, deleteRecurring, applyRecurring, CATEGORIES };

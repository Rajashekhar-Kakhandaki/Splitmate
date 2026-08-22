const prisma = require("../prismaClient");
const { round2 } = require("../services/balanceEngine");

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

// GET /api/rooms/:id/budget
// Returns the budget limit plus current month's spend and percentage.
async function getBudget(req, res, next) {
  try {
    const roomId = req.params.id;
    await loadMembership(roomId, req.user.id);

    const budget = await prisma.roomBudget.findUnique({ where: { roomId } });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const expenses = await prisma.expense.findMany({
      where: { roomId, date: { gte: startOfMonth } },
      select: { amount: true },
    });

    const totalThisMonth = round2(expenses.reduce((s, e) => s + Number(e.amount), 0));
    const monthlyLimit = budget ? Number(budget.monthlyLimit) : null;
    const percentage = monthlyLimit && monthlyLimit > 0
      ? Math.round((totalThisMonth / monthlyLimit) * 100)
      : null;

    res.json({ monthlyLimit, totalThisMonth, percentage });
  } catch (err) {
    next(err);
  }
}

// PUT /api/rooms/:id/budget
// Creates or updates the monthly limit for this room.
async function setBudget(req, res, next) {
  try {
    const roomId = req.params.id;
    await loadMembership(roomId, req.user.id);

    const { monthlyLimit } = req.body;
    if (!monthlyLimit || Number(monthlyLimit) <= 0) {
      return res.status(400).json({ error: "Monthly limit must be a positive number." });
    }

    const budget = await prisma.roomBudget.upsert({
      where: { roomId },
      create: { roomId, monthlyLimit: Number(monthlyLimit) },
      update: { monthlyLimit: Number(monthlyLimit) },
    });

    res.json({ monthlyLimit: Number(budget.monthlyLimit) });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/rooms/:id/budget
async function deleteBudget(req, res, next) {
  try {
    const roomId = req.params.id;
    await loadMembership(roomId, req.user.id);

    await prisma.roomBudget.deleteMany({ where: { roomId } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { getBudget, setBudget, deleteBudget };

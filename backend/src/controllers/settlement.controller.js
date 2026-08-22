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
  const [expenses, settlements, members] = await Promise.all([
    prisma.expense.findMany({ where: { roomId }, include: { shares: true } }),
    prisma.settlement.findMany({
      where: { status: "settled", payerUser: { roomMemberships: { some: { roomId } } } },
    }),
    prisma.roomMember.findMany({
      where: { roomId },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  // Settlements are per-user, not per-room, so filter to ones that are
  // actually between two members of *this* room.
  const memberIds = new Set(members.map((m) => m.user.id));
  const roomSettlements = settlements.filter(
    (s) => memberIds.has(s.payer) && memberIds.has(s.receiver)
  );

  const pendingSettlements = await prisma.settlement.findMany({
    where: { status: "pending", payer: { in: Array.from(memberIds) }, receiver: { in: Array.from(memberIds) } },
  });

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

  return {
    netBalances,
    suggestions: suggestions.map((s) => ({
      ...s,
      fromName: nameById[s.from] || "Unknown",
      toName: nameById[s.to] || "Unknown",
    })),
    pendingSettlements: pendingSettlements.map((s) => ({
      ...s,
      amount: Number(s.amount),
      fromName: nameById[s.payer] || "Unknown",
      toName: nameById[s.receiver] || "Unknown",
      paymentMethod: s.paymentMethod,
    })),
    nameById,
  };
}

// GET /api/rooms/:id/settlements/suggestions
// The minimized set of payments that would settle the whole room up.
async function getSuggestions(req, res, next) {
  try {
    const roomId = req.params.id;
    await loadMembership(roomId, req.user.id);

    const { suggestions, pendingSettlements } = await getBalancesAndSuggestions(roomId);
    res.json({ suggestions, pendingSettlements });
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
        payer: { id: s.payerUser.id, name: s.payerUser.name },
        receiver: { id: s.receiverUser.id, name: s.receiverUser.name },
      })),
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/rooms/:id/settlements
// "Mark as settled" — logs that a payment (usually one of the suggested
// ones) actually happened. Recorded straight as status "settled" since
// the action itself is the user confirming money already changed hands.
async function createSettlement(req, res, next) {
  try {
    const roomId = req.params.id;
    const room = await loadMembership(roomId, req.user.id);
    const memberIds = room.members.map((m) => m.userId);

    const { payer, receiver, amount, status = "settled", paymentMethod } = req.body;

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
    if (status === "settled" && req.user.id !== receiver) {
      return res.status(403).json({ error: "Only the receiver can confirm and mark this as settled." });
    }

    // Clean up any existing pending settlements between these two members in this direction
    // to prevent duplicate banners or stale notifications.
    await prisma.settlement.deleteMany({
      where: { payer, receiver, status: "pending" }
    });

    const settlement = await prisma.settlement.create({
      data: { payer, receiver, amount, status, paymentMethod },
      include: {
        payerUser: { select: { id: true, name: true } },
        receiverUser: { select: { id: true, name: true } },
      },
    });

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

module.exports = {
  getSuggestions,
  listSettlements,
  createSettlement,
  getBalancesAndSuggestions,
  loadMembership,
};

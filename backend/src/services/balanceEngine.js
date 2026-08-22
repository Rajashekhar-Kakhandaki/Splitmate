// Balance engine — the core of the app.
//
// Deliberately pure and Prisma-free: everything here takes plain data in
// and returns plain data out, so it can be unit-tested without a database
// and reused anywhere (API, a future CLI, reports, etc).
//
// Model: every expense has a payer and a set of shares. A share held by
// anyone other than the payer is a debt from that member to the payer.
// We collect all such debts, then net each pair of members against each
// other so "A owes B ₹300, B owes A ₹120" collapses to "A owes B ₹180".

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Builds a directed debt matrix from a list of expenses.
 * @param {Array<{ paidBy: string, shares: Array<{ memberId: string, shareAmount: number }> }>} expenses
 * @returns {Object} debt[owerId][owedToId] = amount owed (raw, not yet netted)
 */
function buildDebtMatrix(expenses) {
  const debt = {};

  for (const expense of expenses) {
    for (const share of expense.shares) {
      if (share.memberId === expense.paidBy) continue; // payer doesn't owe themself
      if (!(share.shareAmount > 0)) continue;

      debt[share.memberId] = debt[share.memberId] || {};
      debt[share.memberId][expense.paidBy] =
        round2((debt[share.memberId][expense.paidBy] || 0) + share.shareAmount);
    }
  }

  return debt;
}

/**
 * Nets every pair of members against each other so only one direction of
 * debt survives per pair.
 * @param {Object} debtMatrix output of buildDebtMatrix
 * @param {string[]} memberIds all member ids in the room (ensures isolated
 *   members with zero debts are still considered, though they simply won't
 *   appear in the output)
 * @returns {Object} net[owerId][owedToId] = amount, always > 0
 */
function netDebts(debtMatrix, memberIds) {
  const net = {};

  for (let i = 0; i < memberIds.length; i++) {
    for (let j = i + 1; j < memberIds.length; j++) {
      const a = memberIds[i];
      const b = memberIds[j];
      const aOwesB = debtMatrix[a]?.[b] || 0;
      const bOwesA = debtMatrix[b]?.[a] || 0;
      const diff = round2(aOwesB - bOwesA);

      if (diff > 0) {
        net[a] = net[a] || {};
        net[a][b] = diff;
      } else if (diff < 0) {
        net[b] = net[b] || {};
        net[b][a] = round2(-diff);
      }
    }
  }

  return net;
}

/**
 * Summarizes one member's position within a netted debt matrix.
 * @returns {{ youOwe: number, youAreOwed: number, breakdown: Array }}
 */
function summarizeForMember(netMatrix, memberId) {
  let youOwe = 0;
  let youAreOwed = 0;
  const breakdown = [];

  for (const [ower, owedTo] of Object.entries(netMatrix)) {
    for (const [receiver, amount] of Object.entries(owedTo)) {
      if (ower === memberId) {
        youOwe = round2(youOwe + amount);
        breakdown.push({ memberId: receiver, amount, direction: "owe" });
      } else if (receiver === memberId) {
        youAreOwed = round2(youAreOwed + amount);
        breakdown.push({ memberId: ower, amount, direction: "owed" });
      }
    }
  }

  return { youOwe, youAreOwed, breakdown };
}

/**
 * Convenience entry point: expenses + member ids in, per-member summaries
 * out, keyed by member id.
 */
function computeRoomBalances(expenses, memberIds) {
  const debtMatrix = buildDebtMatrix(expenses);
  const netMatrix = netDebts(debtMatrix, memberIds);

  const summaries = {};
  for (const memberId of memberIds) {
    summaries[memberId] = summarizeForMember(netMatrix, memberId);
  }

  return { netMatrix, summaries };
}

/**
 * Computes each member's single overall net balance — not netted pairwise
 * like computeRoomBalances, but their one true position: how much more
 * they've fronted than they owe, across every expense, minus whatever
 * they've already settled.
 *
 * This is the input the debt simplifier needs: it can't work from the
 * pairwise netMatrix (that's per-pair, not a global position), it needs
 * one number per person.
 *
 * net > 0 → owed money overall
 * net < 0 → owes money overall
 *
 * @param {Array<{ paidBy: string, amount: number, shares: Array<{ memberId: string, shareAmount: number }> }>} expenses
 * @param {Array<{ payer: string, receiver: string, amount: number }>} settledSettlements
 *   Only settlements with status "settled" should be passed in — a pending
 *   settlement hasn't actually moved money yet.
 * @returns {Record<string, number>} memberId -> net balance
 */
function computeOverallBalances(expenses, settledSettlements = []) {
  const balance = {};
  const bump = (memberId, delta) => {
    balance[memberId] = round2((balance[memberId] || 0) + delta);
  };

  for (const expense of expenses) {
    bump(expense.paidBy, expense.amount);
    for (const share of expense.shares) {
      bump(share.memberId, -share.shareAmount);
    }
  }

  // A settlement of "payer paid receiver ₹X" reduces what payer owes
  // (or adds to what they're owed) by X, and the mirror for receiver —
  // exactly like an expense the payer "paid" that only the receiver
  // "shares" in.
  for (const s of settledSettlements) {
    bump(s.payer, s.amount);
    bump(s.receiver, -s.amount);
  }

  return balance;
}

module.exports = {
  round2,
  buildDebtMatrix,
  netDebts,
  summarizeForMember,
  computeRoomBalances,
  computeOverallBalances,
};

// Debt simplifier — turns "who owes what overall" into the smallest
// practical set of payments that settles everyone up.
//
// True minimum-transaction settlement is NP-hard in general, but the
// standard greedy approach (repeatedly match the biggest debtor to the
// biggest creditor) gets very close in practice and is what apps like
// Splitwise use. It's what "minimize the number of transactions" means
// here.
//
// Deliberately pure and Prisma-free, same as balanceEngine.js.

const EPSILON = 0.005; // half a paisa — treat anything under this as zero

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * @param {Record<string, number>} netBalances memberId -> net balance
 *   (positive = owed money, negative = owes money), e.g. from
 *   balanceEngine.computeOverallBalances.
 * @returns {Array<{ from: string, to: string, amount: number }>} the
 *   smallest practical set of payments that settles every balance to zero.
 */
function simplifyDebts(netBalances) {
  const debtors = [];
  const creditors = [];

  for (const [memberId, amount] of Object.entries(netBalances)) {
    if (amount < -EPSILON) debtors.push({ id: memberId, amount: -amount });
    else if (amount > EPSILON) creditors.push({ id: memberId, amount });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = round2(Math.min(debtor.amount, creditor.amount));

    if (amount > EPSILON) {
      transactions.push({ from: debtor.id, to: creditor.id, amount });
    }

    debtor.amount = round2(debtor.amount - amount);
    creditor.amount = round2(creditor.amount - amount);

    if (debtor.amount <= EPSILON) i += 1;
    if (creditor.amount <= EPSILON) j += 1;
  }

  return transactions;
}

module.exports = { simplifyDebts };

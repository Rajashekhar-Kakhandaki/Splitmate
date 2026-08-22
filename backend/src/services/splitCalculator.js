// Turns an expense amount into per-member shares. Equal split only for
// now — "custom split" in the spec means picking *which* members share
// the bill, not assigning arbitrary custom amounts per person.

const { round2 } = require("./balanceEngine");

/**
 * @param {number} amount total expense amount
 * @param {string[]} memberIds members included in the split
 * @returns {Array<{ memberId: string, shareAmount: number }>} shares that
 *   sum exactly to `amount` (leftover paise distributed one at a time so
 *   no rounding error is lost).
 */
function calculateEqualShares(amount, memberIds) {
  if (!memberIds.length) {
    throw new Error("At least one member must be included in the split.");
  }

  const count = memberIds.length;
  const base = Math.floor((amount / count) * 100) / 100;

  const shares = memberIds.map((memberId) => ({ memberId, shareAmount: base }));

  const distributed = round2(base * count);
  let remainderCents = Math.round(round2(amount - distributed) * 100);

  let i = 0;
  while (remainderCents > 0) {
    shares[i % count].shareAmount = round2(shares[i % count].shareAmount + 0.01);
    remainderCents -= 1;
    i += 1;
  }

  return shares;
}

module.exports = { calculateEqualShares };

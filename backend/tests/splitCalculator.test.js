const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateEqualShares } = require("../src/services/splitCalculator");

test("splits evenly when amount divides cleanly", () => {
  const shares = calculateEqualShares(500, ["a", "b", "c", "d", "e"]);
  assert.deepEqual(
    shares.map((s) => s.shareAmount),
    [100, 100, 100, 100, 100]
  );
});

test("splits ₹64 across 3 members without losing paise", () => {
  const shares = calculateEqualShares(64, ["a", "b", "c"]);
  const total = shares.reduce((sum, s) => sum + s.shareAmount, 0);
  assert.equal(Math.round(total * 100) / 100, 64);
  // base is 21.33, one member should pick up the extra paisa
  const amounts = shares.map((s) => s.shareAmount).sort();
  assert.deepEqual(amounts, [21.33, 21.33, 21.34]);
});

test("custom subset: ₹600 split between 3 of 5 members = ₹200 each", () => {
  const shares = calculateEqualShares(600, ["a", "b", "c"]);
  assert.deepEqual(
    shares.map((s) => s.shareAmount),
    [200, 200, 200]
  );
});

test("single member gets the full amount", () => {
  const shares = calculateEqualShares(150, ["a"]);
  assert.deepEqual(shares, [{ memberId: "a", shareAmount: 150 }]);
});

test("throws on empty member list", () => {
  assert.throws(() => calculateEqualShares(100, []));
});

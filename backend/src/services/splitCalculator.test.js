const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateEqualShares } = require("./splitCalculator");

test("splits evenly when the amount divides cleanly", () => {
  const shares = calculateEqualShares(500, ["a", "b", "c", "d", "e"]);
  assert.equal(shares.length, 5);
  for (const s of shares) assert.equal(s.shareAmount, 100);
});

test("distributes leftover paisa so shares sum exactly (₹64 / 3)", () => {
  const shares = calculateEqualShares(64, ["a", "b", "c"]);
  const total = shares.reduce((sum, s) => sum + s.shareAmount, 0);
  assert.equal(Math.round(total * 100) / 100, 64);
  // No share should be off by more than a paisa from the base amount.
  const base = Math.floor((64 / 3) * 100) / 100;
  for (const s of shares) {
    assert.ok(s.shareAmount === base || s.shareAmount === Math.round((base + 0.01) * 100) / 100);
  }
});

test("matches the chicken-bill example from the spec (₹600 / 3 = ₹200 each)", () => {
  const shares = calculateEqualShares(600, ["a", "b", "c"]);
  assert.deepEqual(
    shares.map((s) => s.shareAmount),
    [200, 200, 200]
  );
});

test("throws when no members are included", () => {
  assert.throws(() => calculateEqualShares(100, []));
});

test("a single member gets the full amount", () => {
  const shares = calculateEqualShares(150.5, ["solo"]);
  assert.deepEqual(shares, [{ memberId: "solo", shareAmount: 150.5 }]);
});

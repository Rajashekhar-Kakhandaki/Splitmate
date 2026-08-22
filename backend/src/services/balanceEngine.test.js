const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildDebtMatrix,
  netDebts,
  computeRoomBalances,
  computeOverallBalances,
} = require("./balanceEngine");
const { calculateEqualShares } = require("./splitCalculator");

test("buildDebtMatrix: payer never owes themself", () => {
  const expenses = [
    {
      paidBy: "rahul",
      shares: calculateEqualShares(500, ["rahul", "akash"]),
    },
  ];
  const matrix = buildDebtMatrix(expenses);
  assert.equal(matrix.rahul, undefined);
  assert.equal(matrix.akash.rahul, 250);
});

test("netDebts collapses reciprocal debt into a single direction", () => {
  // A owes B 300, B owes A 120 -> A owes B 180.
  const matrix = { a: { b: 300 }, b: { a: 120 } };
  const net = netDebts(matrix, ["a", "b"]);
  assert.equal(net.a.b, 180);
  assert.equal(net.b, undefined);
});

test("netDebts produces nothing for a pair that's exactly settled", () => {
  const matrix = { a: { b: 100 }, b: { a: 100 } };
  const net = netDebts(matrix, ["a", "b"]);
  assert.deepEqual(net, {});
});

test("computeRoomBalances: rent split 5 ways, one payer", () => {
  const expenses = [
    {
      paidBy: "rahul",
      shares: calculateEqualShares(500, ["rahul", "akash", "rohit", "naveen", "raj"]),
    },
  ];
  const memberIds = ["rahul", "akash", "rohit", "naveen", "raj"];
  const { summaries } = computeRoomBalances(expenses, memberIds);

  assert.equal(summaries.rahul.youAreOwed, 400);
  assert.equal(summaries.rahul.youOwe, 0);

  for (const id of ["akash", "rohit", "naveen", "raj"]) {
    assert.equal(summaries[id].youOwe, 100);
    assert.equal(summaries[id].youAreOwed, 0);
  }
});

test("computeRoomBalances: custom split excludes non-participants (chicken bill)", () => {
  // ₹600 chicken bill, Rahul pays, split only between Rahul/Akash/Rohit.
  const expenses = [
    {
      paidBy: "rahul",
      shares: calculateEqualShares(600, ["rahul", "akash", "rohit"]),
    },
  ];
  const memberIds = ["rahul", "akash", "rohit", "naveen", "raj"];
  const { summaries } = computeRoomBalances(expenses, memberIds);

  assert.equal(summaries.rahul.youAreOwed, 400);
  assert.equal(summaries.akash.youOwe, 200);
  assert.equal(summaries.rohit.youOwe, 200);
  // Members outside the split have no stake in this expense at all.
  assert.equal(summaries.naveen.youOwe, 0);
  assert.equal(summaries.naveen.youAreOwed, 0);
  assert.equal(summaries.raj.youOwe, 0);
  assert.equal(summaries.raj.youAreOwed, 0);
});

test("computeRoomBalances: multiple expenses net out to zero when balanced", () => {
  const expenses = [
    { paidBy: "rahul", shares: calculateEqualShares(200, ["rahul", "akash"]) },
    { paidBy: "akash", shares: calculateEqualShares(200, ["rahul", "akash"]) },
  ];
  const { summaries } = computeRoomBalances(expenses, ["rahul", "akash"]);
  assert.equal(summaries.rahul.youOwe, 0);
  assert.equal(summaries.rahul.youAreOwed, 0);
  assert.equal(summaries.akash.youOwe, 0);
  assert.equal(summaries.akash.youAreOwed, 0);
});

test("computeRoomBalances: breakdown names the specific member on each side of a debt", () => {
  const expenses = [
    { paidBy: "rahul", shares: calculateEqualShares(300, ["rahul", "akash"]) },
  ];
  const { summaries } = computeRoomBalances(expenses, ["rahul", "akash"]);

  assert.equal(summaries.akash.breakdown.length, 1);
  assert.equal(summaries.akash.breakdown[0].memberId, "rahul");
  assert.equal(summaries.akash.breakdown[0].direction, "owe");
  assert.equal(summaries.akash.breakdown[0].amount, 150);
});

test("computeOverallBalances: matches computeRoomBalances totals for a simple case", () => {
  const shares = calculateEqualShares(500, ["rahul", "akash", "rohit", "naveen", "raj"]);
  const expenses = [{ paidBy: "rahul", amount: 500, shares }];

  const overall = computeOverallBalances(expenses);
  assert.equal(overall.rahul, 400);
  assert.equal(overall.akash, -100);
  assert.equal(overall.rohit, -100);
  assert.equal(overall.naveen, -100);
  assert.equal(overall.raj, -100);
});

test("computeOverallBalances: a settled settlement offsets the balance it covers", () => {
  const shares = calculateEqualShares(400, ["rahul", "akash"]);
  const expenses = [{ paidBy: "rahul", amount: 400, shares }];

  // Before any settlement: Akash owes Rahul 200.
  const before = computeOverallBalances(expenses);
  assert.equal(before.rahul, 200);
  assert.equal(before.akash, -200);

  // Akash pays Rahul the full 200 — settlement recorded as settled.
  const after = computeOverallBalances(expenses, [
    { payer: "akash", receiver: "rahul", amount: 200 },
  ]);
  assert.equal(after.rahul, 0);
  assert.equal(after.akash, 0);
});

test("computeOverallBalances: a partial settlement leaves a smaller remaining balance", () => {
  const shares = calculateEqualShares(400, ["rahul", "akash"]);
  const expenses = [{ paidBy: "rahul", amount: 400, shares }];

  const after = computeOverallBalances(expenses, [
    { payer: "akash", receiver: "rahul", amount: 50 },
  ]);
  assert.equal(after.rahul, 150);
  assert.equal(after.akash, -150);
});

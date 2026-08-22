const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildDebtMatrix,
  netDebts,
  computeRoomBalances,
} = require("../src/services/balanceEngine");

test("buildDebtMatrix: payer owes nothing to themself", () => {
  const expenses = [
    {
      paidBy: "a",
      shares: [
        { memberId: "a", shareAmount: 100 },
        { memberId: "b", shareAmount: 100 },
        { memberId: "c", shareAmount: 100 },
      ],
    },
  ];
  const debt = buildDebtMatrix(expenses);
  assert.equal(debt.a, undefined);
  assert.equal(debt.b.a, 100);
  assert.equal(debt.c.a, 100);
});

test("netDebts: mutual debts collapse to a single direction", () => {
  // B owes A 150 (A paid 300 split A/B), A owes B 50 (B paid 100 split A/B)
  const expenses = [
    { paidBy: "a", shares: [{ memberId: "a", shareAmount: 150 }, { memberId: "b", shareAmount: 150 }] },
    { paidBy: "b", shares: [{ memberId: "a", shareAmount: 50 }, { memberId: "b", shareAmount: 50 }] },
  ];
  const debt = buildDebtMatrix(expenses);
  const net = netDebts(debt, ["a", "b"]);
  // net: b owed a 150, a owed b 50 -> net b owes a 100
  assert.equal(net.b.a, 100);
  assert.equal(net.a, undefined);
});

test("netDebts: equal mutual debts cancel out entirely", () => {
  const expenses = [
    { paidBy: "a", shares: [{ memberId: "a", shareAmount: 50 }, { memberId: "b", shareAmount: 50 }] },
    { paidBy: "b", shares: [{ memberId: "a", shareAmount: 50 }, { memberId: "b", shareAmount: 50 }] },
  ];
  const debt = buildDebtMatrix(expenses);
  const net = netDebts(debt, ["a", "b"]);
  assert.deepEqual(net, {});
});

test("computeRoomBalances: matches the DSATM Boys Room style scenario", () => {
  // Rahul pays ₹500 rent, split equally among 5 members (₹100 each).
  // Akash pays ₹64 milk, split among 3 (Rahul, Akash, Rohit) -> ~21.33 each.
  const members = ["rahul", "akash", "rohit", "naveen", "raj"];
  const expenses = [
    {
      paidBy: "rahul",
      shares: members.map((m) => ({ memberId: m, shareAmount: 100 })),
    },
    {
      paidBy: "akash",
      shares: [
        { memberId: "rahul", shareAmount: 21.34 },
        { memberId: "akash", shareAmount: 21.33 },
        { memberId: "rohit", shareAmount: 21.33 },
      ],
    },
  ];

  const { summaries } = computeRoomBalances(expenses, members);

  // Rahul is owed 100 each by akash/rohit/naveen/raj for rent (400),
  // and owes akash 21.34 for milk -> net owed ~378.66
  assert.equal(summaries.rahul.youAreOwed, 378.66);
  assert.equal(summaries.rahul.youOwe, 0);

  // Naveen and Raj only owe the ₹100 rent share each, weren't in the milk split
  assert.equal(summaries.naveen.youOwe, 100);
  assert.equal(summaries.raj.youOwe, 100);
});

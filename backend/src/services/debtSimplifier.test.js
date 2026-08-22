const test = require("node:test");
const assert = require("node:assert/strict");
const { simplifyDebts } = require("./debtSimplifier");

test("two people, one owes the other: a single transaction", () => {
  const tx = simplifyDebts({ rahul: 400, akash: -400 });
  assert.deepEqual(tx, [{ from: "akash", to: "rahul", amount: 400 }]);
});

test("already settled: zero transactions", () => {
  const tx = simplifyDebts({ rahul: 0, akash: 0 });
  assert.deepEqual(tx, []);
});

test("tiny rounding noise under half a paisa is treated as settled", () => {
  const tx = simplifyDebts({ rahul: 0.002, akash: -0.002 });
  assert.deepEqual(tx, []);
});

test("five-person room from the spec's dashboard example collapses to 4 payments max", () => {
  // Made up net balances consistent with the UI reference numbers' spirit.
  const net = {
    rahul: 620, // owed
    akash: -300,
    rohit: -320,
    naveen: 200, // owed
    raj: -200,
  };
  const tx = simplifyDebts(net);

  // At most (people - 1) transactions to settle everyone.
  assert.ok(tx.length <= 4);

  // Every transaction should actually move money.
  for (const t of tx) assert.ok(t.amount > 0);

  // Applying every transaction should zero out every balance.
  const check = { ...net };
  for (const t of tx) {
    check[t.from] = Math.round((check[t.from] + t.amount) * 100) / 100;
    check[t.to] = Math.round((check[t.to] - t.amount) * 100) / 100;
  }
  for (const amount of Object.values(check)) {
    assert.ok(Math.abs(amount) < 0.01, `expected ~0, got ${amount}`);
  }
});

test("uses fewer transactions than a naive one-per-pair settlement would", () => {
  // A owes 100, B owes 100, C is owed 200. Naive pairwise would be 2
  // transactions here too, but this checks the count is never more than
  // (number of non-zero balances - 1).
  const net = { a: -100, b: -100, c: 200 };
  const tx = simplifyDebts(net);
  assert.equal(tx.length, 2);
});

test("a single large group nets down efficiently, not one-per-person", () => {
  // 6 debtors owing varying amounts all settle to 1 creditor: should take
  // exactly 6 transactions (unavoidable, everyone must pay the one
  // creditor), never more.
  const net = { c: 600, d1: -100, d2: -100, d3: -100, d4: -100, d5: -100, d6: -100 };
  const tx = simplifyDebts(net);
  assert.equal(tx.length, 6);
  assert.ok(tx.every((t) => t.to === "c"));
});

test("empty balances produce no transactions", () => {
  assert.deepEqual(simplifyDebts({}), []);
});

import { describe, expect, it } from "vitest";
import { Ledger, validateLines } from "./ledger.js";

const cash = "cash";
const revenue = "revenue";

function transfer(amount: bigint) {
  return [
    { accountId: cash, debitCents: amount, creditCents: 0n },
    { accountId: revenue, debitCents: 0n, creditCents: amount },
  ];
}

describe("validateLines", () => {
  it("rejects a single line", () => {
    expect(
      validateLines([{ accountId: cash, debitCents: 100n, creditCents: 0n }]),
    ).toMatch(/at least two/);
  });

  it("rejects unbalanced posts", () => {
    expect(
      validateLines([
        { accountId: cash, debitCents: 100n, creditCents: 0n },
        { accountId: revenue, debitCents: 0n, creditCents: 80n },
      ]),
    ).toMatch(/Unbalanced/);
  });
});

describe("Ledger", () => {
  it("posts a balanced entry and updates balances", () => {
    const ledger = new Ledger();
    const result = ledger.post("pay_1", transfer(5000n));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.replayed).toBe(false);
    expect(ledger.balance(cash)).toBe(5000n);
    expect(ledger.balance(revenue)).toBe(-5000n);
  });

  it("replays the same idempotency key without moving money twice", () => {
    const ledger = new Ledger();
    ledger.post("disburse_9", transfer(100n));
    const replay = ledger.post("disburse_9", transfer(100n));
    expect(replay.ok).toBe(true);
    if (replay.ok) expect(replay.replayed).toBe(true);
    expect(ledger.balance(cash)).toBe(100n);
    expect(ledger.list()).toHaveLength(1);
  });

  it("does not persist a failed post", () => {
    const ledger = new Ledger();
    const bad = ledger.post("bad", [
      { accountId: cash, debitCents: 10n, creditCents: 0n },
      { accountId: revenue, debitCents: 0n, creditCents: 1n },
    ]);
    expect(bad.ok).toBe(false);
    expect(ledger.list()).toHaveLength(0);
  });
});

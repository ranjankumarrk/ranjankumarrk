export type AccountId = string;
export type IdempotencyKey = string;

export interface JournalLine {
  accountId: AccountId;
  /** Integer cents. Exactly one of debitCents or creditCents must be > 0. */
  debitCents: bigint;
  creditCents: bigint;
}

export interface JournalEntry {
  id: string;
  idempotencyKey: IdempotencyKey;
  lines: readonly JournalLine[];
}

export type PostResult =
  | { ok: true; entry: JournalEntry; replayed: boolean }
  | { ok: false; error: string };

function isPositive(n: bigint): boolean {
  return n > 0n;
}

export function validateLines(lines: readonly JournalLine[]): string | null {
  if (lines.length < 2) return "A journal entry needs at least two lines";

  let debits = 0n;
  let credits = 0n;

  for (const line of lines) {
    if (!line.accountId) return "accountId is required";
    if (line.debitCents < 0n || line.creditCents < 0n) return "Amounts cannot be negative";
    if (isPositive(line.debitCents) === isPositive(line.creditCents)) {
      return "Each line must be either a debit or a credit, not both or neither";
    }
    debits += line.debitCents;
    credits += line.creditCents;
  }

  if (debits !== credits) {
    return `Unbalanced entry: debits ${debits} != credits ${credits}`;
  }
  return null;
}

/**
 * In-memory double-entry ledger with idempotent posts.
 * Production systems persist the same two invariants:
 * 1. Every accepted entry is balanced.
 * 2. The same idempotency key never creates a second movement of money.
 */
export class Ledger {
  private readonly entries: JournalEntry[] = [];
  private readonly byKey = new Map<IdempotencyKey, JournalEntry>();
  private seq = 0;

  post(idempotencyKey: IdempotencyKey, lines: readonly JournalLine[]): PostResult {
    if (!idempotencyKey.trim()) {
      return { ok: false, error: "idempotencyKey is required" };
    }

    const existing = this.byKey.get(idempotencyKey);
    if (existing) {
      return { ok: true, entry: existing, replayed: true };
    }

    const invalid = validateLines(lines);
    if (invalid) return { ok: false, error: invalid };

    this.seq += 1;
    const entry: JournalEntry = {
      id: `je_${this.seq}`,
      idempotencyKey,
      lines: lines.map((l) => ({ ...l })),
    };
    this.entries.push(entry);
    this.byKey.set(idempotencyKey, entry);
    return { ok: true, entry, replayed: false };
  }

  /** Signed cents: debits increase, credits decrease (asset-style). */
  balance(accountId: AccountId): bigint {
    let cents = 0n;
    for (const entry of this.entries) {
      for (const line of entry.lines) {
        if (line.accountId === accountId) {
          cents += line.debitCents - line.creditCents;
        }
      }
    }
    return cents;
  }

  list(): readonly JournalEntry[] {
    return this.entries;
  }
}

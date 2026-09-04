# ledger-core

Idempotent **double-entry** primitives in TypeScript.

This is the public, stripped-down version of invariants I run in production fintech services (150K+ users, 5M+ monthly transactions): every journal entry balances, and the same idempotency key never moves money twice.

It is **not** a bank. There is no HTTP server, no database, and no customer data. Recruiters and hiring managers can read the whole module in a few minutes.

## Invariants

1. A journal entry has at least two lines.
2. Each line is a debit **or** a credit, never both or neither.
3. `sum(debits) === sum(credits)` or the post is rejected.
4. `post(key, lines)` is safe to retry: a duplicate key returns the original entry (`replayed: true`) and does not change balances.

Those four rules are why webhook retries, SQS redeliveries, and client double-clicks do not double-disburse.

## Install / test

```bash
npm install
npm test
```

## Usage

```ts
import { Ledger } from "./src/ledger.js";

const ledger = new Ledger();

ledger.post("txn_disburse_42", [
  { accountId: "cash", debitCents: 10_000n, creditCents: 0n },
  { accountId: "loans_receivable", debitCents: 0n, creditCents: 10_000n },
]);

ledger.post("txn_disburse_42", [
  { accountId: "cash", debitCents: 10_000n, creditCents: 0n },
  { accountId: "loans_receivable", debitCents: 0n, creditCents: 10_000n },
]); // replayed: true — cash still 10000

ledger.balance("cash"); // 10000n
```

## Production mapping

| This repo | Production (EWNS, private) |
| --- | --- |
| In-memory `Map` keyed by idempotency key | Unique constraint + outbox / SQS consumer |
| `bigint` cents | Integer minor units in PostgreSQL |
| `validateLines` | Same check before commit, plus account-type rules |
| Single process | NestJS workers + BullMQ / AWS SQS, dead-letter retries |

Architecture write-ups (no proprietary code):

- [40% API latency cut](https://ranjankumarrk.github.io/case-studies/latency.html)
- [KYC 3 days → 15 minutes](https://ranjankumarrk.github.io/case-studies/kyc.html)

## Author

**Ranjan Kumar** (`ranjankumarrk`) · Senior Software Engineer · 5+ years · Node.js / NestJS / Golang / AWS  
Open to remote roles in the USA, Singapore, India, and worldwide.

- Portfolio: https://ranjankumarrk.github.io
- LinkedIn: https://www.linkedin.com/in/ranjankumarrk/
- GitHub: https://github.com/ranjankumarrk
- LeetCode: https://leetcode.com/u/ranjankumarrk/
- Resume: https://ranjankumarrk.github.io/resume.html

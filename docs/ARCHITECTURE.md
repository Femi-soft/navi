# Scaffold architecture

The PRD's modular monolith is represented by a Next.js application and domain packages that can later be split without changing their contracts.

```text
apps/web (presentation + API orchestration)
  -> ai (intent classification + explanation only)
  -> portfolio / opportunities (timestamped facts)
  -> risk / strategy (deterministic calculations)
  -> policy / simulation (safety gate)
  -> execution (reviewed adapters only)
  -> user wallet (signature)
  -> X Layer (settlement and receipt verification)
```

The demo API composes in-memory providers so the architecture can be exercised without claiming that sample values are live. Provider interfaces are the seams for RPC, price, DeFi, RWA, database, and simulation integrations.

## Package responsibilities

| Package | Responsibility | May prepare transactions? |
| --- | --- | --- |
| `core` | Shared schemas, money and freshness helpers | No |
| `portfolio` | Portfolio aggregation and snapshots | No |
| `opportunities` | Normalize and discover DeFi/RWA opportunities | No |
| `risk` | Versioned deterministic risk scoring | No |
| `policy` | Rule-by-rule PASS/WARNING/BLOCK evaluation | No |
| `strategy` | Filter, rank, allocate, and calculate trade-offs | No |
| `simulation` | Project outcomes and issue expiring evidence | No |
| `ai` | Classify intent and explain structured engine output | No |
| `execution` | Validate fresh simulation and invoke allowlisted adapter | Yes, but never signs |

## Delivery sequence

The next implementation milestones follow the PRD build order: wallet/auth/database; live portfolio; opportunity feeds; provider-backed AI intent parsing; strategy UX; RPC simulation and policy UI; one reviewed adapter and wallet execution; monitoring; then contracts and audit work.

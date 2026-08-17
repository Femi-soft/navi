# Production-foundation architecture

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

The dashboard still uses demo composition, but protected API boundaries now fail closed unless production configuration is present. Wallet authentication uses a short-lived, one-use server nonce, an EIP-191 wallet signature, an HttpOnly signed session, and a Supabase-backed nonce consumer. Live portfolio reads combine independently sourced X Layer RPC balance data with timestamped provider pricing. A submitted transaction remains unverified until the receipt verifier observes a successful canonical X Layer receipt with the configured confirmation depth.

No arbitrary protocol adapter has been added. A production adapter requires an explicitly selected protocol, reviewed X Layer contract addresses, allowed selectors/assets, exact amount bounds, provider-backed simulation, and security review before registration.

The onchain executor mirrors that boundary: it can call only a reviewed `INaviAdapter`, deploys paused, and begins with an empty adapter allowlist. It passes the initiating user and immutable strategy identifier to the adapter and records a hash of adapter calldata. Protocol-specific validation remains the adapter's responsibility; the executor is not evidence that a simulation or policy decision was valid.

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

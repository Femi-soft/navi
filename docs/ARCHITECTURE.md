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
  -> network-specific executor (settlement and receipt verification)
```

X Layer testnet `1952` remains NAVI's target settlement environment. Base Sepolia `84532` is a separately keyed protocol-validation environment for authoritative Aave and Centrifuge integration work. Executors, policy commitments, simulations, providers, deployment artifacts and receipts are chain-bound and cannot be promoted or replayed across the two networks.

The dashboard still uses demo composition, but protected API boundaries now fail closed unless production configuration is present. Wallet authentication uses a short-lived, one-use server nonce, an EIP-191 wallet signature, an HttpOnly signed session, and a Supabase-backed nonce consumer. Live portfolio reads combine independently sourced X Layer RPC balance data with timestamped provider pricing. A submitted transaction remains unverified until the receipt verifier observes a successful canonical X Layer receipt with the configured confirmation depth.

No arbitrary protocol adapter may be registered. The Base Sepolia candidates use immutable protocol, vault and asset targets with exact action and amount bounds. A production adapter still requires an explicitly selected protocol, reviewed deployment addresses, provider-backed simulation, and security review before registration.

The onchain executor mirrors that boundary: it can call only a reviewed `INaviAdapter`, deploys paused, and begins with an empty adapter allowlist. It passes the initiating user and immutable strategy identifier to the adapter and records a hash of adapter calldata. Protocol-specific validation remains the adapter's responsibility; the executor is not evidence that a simulation or policy decision was valid.

The V2 audit candidate strengthens this sequence without altering the deployed X Layer V1 bytecode. An adapter-defined unsigned transaction is simulated through a chain-specific provider at a concrete block. NAVI binds the exact chain, sender, target, calldata, value, policy, block and expiry into signed server evidence. Transaction preparation verifies that attestation and revalidates the final wallet artifact. V2 additionally checks the user's current domain-separated policy commitment, consumes the simulation hash once per user and enforces its deadline onchain. V2 and the fixed Aave adapter are deployed on Base Sepolia only; the executor remains paused and the adapter unapproved until an independent audit completes its gate.

Monitoring is a server-only scheduled boundary. It records sourced RPC state, deployed bytecode, executor pause and ownership state, configuration events and independently read canonical receipts. Monitoring observations may raise incidents or finalize a confirmed execution record, but they do not authorize transactions.

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

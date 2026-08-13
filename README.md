# NAVI

NAVI is a non-custodial financial decision system for average crypto users. It turns a user goal into deterministic portfolio analysis, opportunity comparisons, policy-constrained strategies, and expiring simulations. The AI interprets and explains; it does not calculate balances or move assets.

## Current status

This repository is an **MVP scaffold**, not a production trading agent. It contains a working demo data path and tested safety boundaries. Wallet authentication, live indexers, provider-backed simulation, audited adapters/contracts, persistence, and mainnet execution are intentionally not represented as complete.

## Run it

```powershell
npm.cmd install
npm.cmd run dev
```

Then open `http://localhost:3000`.

Validation:

```powershell
npm.cmd run validate
```

## Trust boundary

1. Data providers produce timestamped financial facts.
2. Deterministic engines calculate risk, ranking, allocation, trade-offs, and policy results.
3. The AI may classify intent and explain structured results only.
4. A simulation expires after two minutes and must be refreshed before signing.
5. Only an immutable, reviewed protocol adapter may prepare transaction calldata.
6. The connected wallet signs every MVP transaction.
7. A confirmed receipt—not optimistic UI state—updates the authoritative portfolio.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md).

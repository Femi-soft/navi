# NAVI

NAVI is a non-custodial financial decision system for average crypto users. It turns a user goal into deterministic portfolio analysis, opportunity comparisons, policy-constrained strategies, and expiring simulations. The AI interprets and explains; it does not calculate balances or move assets.

## Current status

NAVI is live at [navi-sage-eight.vercel.app](https://navi-sage-eight.vercel.app) as a **public X Layer testnet beta with production foundations**. Wallet authentication, live testnet OKB balances, Supabase persistence, a dedicated QuickNode provider, and source-verified paused contracts are implemented.

NAVI is not a production trading agent or mainnet-ready product. Strategy and opportunity data remain clearly labelled samples. The executor is paused, has no approved adapters, and transaction execution is disabled.

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

Contract-only validation:

```powershell
npm.cmd run contracts:check
```

The guarded testnet deployment command requires a dedicated testnet-only private key in the ignored `apps/web/.env.local`. It verifies chain ID `1952` before Hardhat Ignition can submit anything:

```powershell
npm.cmd run contracts:deploy:testnet
```

This deploys a paused executor with no approved adapters. It does not enable execution.

## Trust boundary

1. Data providers produce timestamped financial facts.
2. Deterministic engines calculate risk, ranking, allocation, trade-offs, and policy results.
3. The AI may classify intent and explain structured results only.
4. A simulation expires after two minutes and must be refreshed before signing.
5. Only an immutable, reviewed protocol adapter may prepare transaction calldata.
6. The connected wallet signs every MVP transaction.
7. A confirmed receipt, not optimistic UI state, updates the authoritative portfolio.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md).

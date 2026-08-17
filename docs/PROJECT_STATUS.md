# Project status

Last updated: 2026-08-17

## Implemented scaffold

- npm workspace and Next.js App Router shell
- overview UI for portfolio, opportunities, permissions, and a proposed strategy
- timestamped demo portfolio and DeFi/RWA opportunity providers
- deterministic risk scoring, policy validation, strategy allocation, and simulation TTL
- structured agent response without model-controlled financial calculations
- adapter-gated transaction preparation contract
- initial PostgreSQL migration and Solidity contract skeletons
- unit tests for key safety boundaries

## Implemented production foundation

- fail-closed production environment validation and health reporting
- X Layer mainnet metadata plus live RPC chain verification
- one-use wallet authentication challenge, signature verification, and HttpOnly signed session
- Supabase server client, nonce persistence, atomic replay prevention, and RLS/least-privilege migration
- authenticated live native-balance portfolio seam with timestamped external price metadata
- independent successful/canonical X Layer receipt verifier
- tests for missing configuration and wallet nonce replay
- dedicated Supabase project `NAVI` (`fwuvethkkvykmciilnot`) created and linked in `eu-west-1`
- remote migrations `20260814000100`, `20260814000200`, and `20260817000100` applied and matched locally
- remote database verification: 9/9 expected tables, RLS enabled 9/9, zero direct `anon`/`authenticated` table grants, fixed security-definer search paths, and atomic nonce replay rejection
- runtime Supabase URL, modern server secret, and session-signing secret provisioned in the ignored web-app environment file
- end-to-end disposable-wallet session verified on 2026-08-14: HTTP nonce issuance, wallet signature, atomic Supabase consumption, verified wallet persistence, HttpOnly session reuse, replay rejection, and clean removal of test records
- dedicated QuickNode X Layer testnet RPC configured locally on 2026-08-17 and verified against chain ID 1952
- internally reviewed contract foundation: adapter-only executor, paused-by-default deployment, empty allowlist, two-step ownership, reentrancy protection, and versioned policy commitments
- pinned Hardhat 3 and OpenZeppelin toolchain with contract tests, X Layer testnet chain guard, and recoverable Ignition deployment module
- guarded X Layer testnet deployment independently verified on 2026-08-17: successful receipts and deployed bytecode for `NaviExecutor` (`0xc019eD728d1A23C995bf7056de1BCc8d9DF32b1d`) and `NaviPolicyManager` (`0x86883d049b0A09d02Eeb056527e7a24522D89F23`)
- verified deployment posture: executor owned by the dedicated testnet deployer, paused, and carrying no approved adapters; execution remains unavailable
- exact creation and runtime bytecode source matches published for both testnet contracts on Sourcify on 2026-08-17 and independently confirmed through its public API
- explicit testnet/mainnet runtime separation across wallet challenges, signed sessions, RPC selection, and live portfolio chain validation
- public wallet connection UI with X Layer testnet switching, nonce-only signature authentication, sourced live OKB balance, logout, and visible sample-data boundaries
- remote migration `20260817000100` applied on 2026-08-17, allowing wallet records only for X Layer testnet `1952` and mainnet `196`
- public testnet beta deployed to Vercel at `https://navi-sage-eight.vercel.app` with encrypted Supabase and QuickNode secrets; no deployer key or mainnet RPC was uploaded
- live-domain verification on 2026-08-17: page and health `200`, RPC chain `1952` fresh and verified, security headers present, disposable-wallet login/live portfolio/replay rejection passed, and test records removed
- explicit chain-1952/196 execution and receipt verification configuration with final prepared-transaction revalidation
- signed provider-simulation evidence model binding exact transaction, policy, concrete block, gas evidence, sourced pricing, economic-outcome verification and expiry
- V2 audit candidate binding execution to domain-separated current policy commitments, non-replayable simulation hashes and deadlines; V1 deployment remains unchanged and paused
- scheduled monitoring scaffold for chain, block freshness, bytecode, pause/owner state, configuration events and canonical receipt reconciliation, with persisted sourced reports and optional webhook alerts
- reproducible GitHub validation and Slither security workflow, incident runbook, protocol-selection record and independent-audit scope

## Not implemented / not production-ready

- live token/protocol position readers and a selected production price provider (native-balance/provider seam exists)
- live DeFi/RWA ingestion and freshness monitoring
- LLM provider integration and prompt-injection hardening tests
- production integration of provider-backed simulation into an authenticated transaction route
- production protocol adapters or transaction broadcast
- applied monitoring migration, provisioned cron/alert secrets, verified alert delivery, and end-to-end live portfolio persistence
- reviewed testnet protocol adapter, independent audits, incident controls, OKLink publication, and mainnet validation

The application is live only as a public X Layer testnet beta with production foundations. It is not a production trading agent or mainnet-ready product. Execution remains disabled.

## External production gates

- implement, review, deploy, and verify one tightly scoped protocol adapter on X Layer testnet while keeping the executor paused until approval
- promote only audited bytecode and reviewed configuration to X Layer mainnet (chain ID 196) using a separate monitored mainnet RPC and explicit launch approval
- provision separate mainnet secrets only after launch approval; never promote the testnet deployer or testnet provider configuration
- select a production-grade price-provider plan and verify fallback, rate-limit, and stale-data behavior under monitoring
- choose one X Layer protocol and obtain independently verified target/asset addresses before implementing its adapter
- commission contract and adapter security audits, remediate findings, and approve deployment artifacts
- complete independent audits and invariant testing, then approve a separately funded mainnet deployer and deployment plan
- execute a capped mainnet canary with explicit user signing, verify the canonical receipt independently, and confirm the refreshed portfolio

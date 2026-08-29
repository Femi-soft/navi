# Project status

Last updated: 2026-08-28

## Implemented scaffold

- npm workspace and Next.js App Router shell
- overview UI for portfolio, opportunities, permissions, and a proposed strategy
- timestamped demo portfolio and DeFi/RWA opportunity providers
- deterministic risk scoring, policy validation, strategy allocation, and simulation TTL
- structured agent response without model-controlled financial calculations
- adapter-gated transaction preparation contract
- initial PostgreSQL migration and Solidity contract skeletons
- unit tests for key safety boundaries
- responsive institutional dashboard shell with persistent desktop/mobile navigation, accessible wallet states, explicit verified-versus-illustrative data boundaries, draft-policy labelling, and scannable DeFi/RWA opportunity comparison
- Ask NAVI chat workspace with authenticated provider access, sourced context states, responsive conversation UI, and explicit execution lock
- activated portfolio, opportunities, strategy, activity, and permissions workspaces: live wallet access and health checks remain provider-backed, while market, strategy, allocation, and editable policy views are explicitly labeled sample or browser-only drafts
- Base Sepolia V3 Day One canary foundation: EIP-712 authorized simulation evidence, canary-user allowlisting, fixed Aave USDC supply/withdraw adapter, `10.000000` USDC action cap, daily user/global limits, separate deployment tooling, fail-closed policy and provider-simulation preparation routes, and non-broadcasting wallet network controls; V3 remains undeployed and disabled

## Implemented production foundation

- fail-closed production environment validation and health reporting
- X Layer mainnet metadata plus live RPC chain verification
- one-use wallet authentication challenge, signature verification, and HttpOnly signed session
- Supabase server client, nonce persistence, atomic replay prevention, and RLS/least-privilege migration
- authenticated live native-balance portfolio seam with timestamped external price metadata
- independent successful/canonical X Layer receipt verifier
- tests for missing configuration and wallet nonce replay
- dedicated Supabase project `NAVI` (`fwuvethkkvykmciilnot`) created and linked in `eu-west-1`
- remote migrations `20260814000100`, `20260814000200`, `20260817000100`, and `20260817000200` applied and matched locally
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
- production monitoring active for chain, block freshness, bytecode, pause/owner state, configuration events and canonical receipt reconciliation, with persisted sourced reports and optional webhook alerts
- first authenticated production monitoring run verified healthy on 2026-08-17 at X Layer testnet block `38523167`; executor and policy bytecode were present, the executor was paused under the expected owner, and no receipt failures or configuration issues were observed
- Vercel daily cron registered for `/api/cron/monitor`; a separate GitHub Actions schedule calls the same authenticated fail-closed probe every 15 minutes
- reproducible GitHub validation and Slither security workflow, incident runbook, protocol-selection record and independent-audit scope
- authoritative deployment requests filed with Stader and X Layer after a fresh chain-1952 probe confirmed all six Stader-published testnet addresses had zero bytecode at block `38528975`
- authority requests refreshed on 2026-08-28: all six Stader targets still had zero bytecode at block `39474770`, the official X Layer docs commit `be3e9444a50468aee5cf2c79b023df025007b817` still exposed no reversible chain-1952 DeFi/RWA registry, and both evidence updates were posted to the open upstream issues
- isolated Base Sepolia chain-84532 configuration, dedicated deployer, guarded V2 Ignition module and fail-closed deployment verifier
- dedicated Base Sepolia deployer funded with `0.005 ETH` on 2026-08-22 and independently confirmed at block `45824878`
- Base Sepolia Aave preflight refreshed successfully on 2026-08-22 at block `45824909`: target bytecode, pool and aToken implementations, USDC metadata, reserve mapping, and pool relationships all matched the pinned registry commit
- guarded Base Sepolia V2 deployment independently verified on 2026-08-22: `NaviPolicyManagerV2` (`0xE8e57B04986F26296A8f86582a9a3cdfdb6D4DF7`), `NaviExecutorV2` (`0x9D110a71F36a4fb1Feaa06E3F76C2e1136C9ACBa`), and `AaveSupplyWithdrawAdapterV2` (`0xA3E6fA5a29b36D83eDF05a4748AbF627E87b5509`) all have successful creation receipts and deployed bytecode
- Base Sepolia V2 executor remains paused, owned by the dedicated deployer, and reports the Aave adapter as unapproved; the adapter is bound to the verified Aave pool, USDC, aUSDC, executor, and `1000.000000` USDC action cap
- Sourcify independently reported exact creation and runtime bytecode matches for all three Base Sepolia contracts on 2026-08-22; reusable chain-guarded publication tooling is available through `npm run contracts:publish:base-sepolia`
- manual BaseScan Standard JSON verification was reported complete by the operator for all three Base Sepolia contracts on 2026-08-22; BaseScan's Cloudflare challenge and credentialed V2 API prevented a separate machine confirmation of the explorer badge
- Base-documented PublicNode fallback explicitly selected for Base Sepolia testnet after two authenticated QuickNode endpoints failed state reads; saved provenance and an extra deployment acknowledgement prevent silent promotion
- fixed-target Aave V3 USDC supply/withdraw adapter capped at `1000.000000` USDC per action, plus an immutable bounded ERC-4626 vault adapter candidate
- local adapter tests cover Aave and ERC-4626 entry/exit, executor-only access, caps, minimum output and zero residual adapter custody
- server-only provider seam with Groq free-tier chat completions for testnet and an OpenAI Responses promotion path; both use structured output validation, non-stored requests, deterministic intent routing, bounded request throttling, and prompt-injection boundary tests
- agent context is assembled by NAVI: authenticated live portfolio data is labeled verified, opportunity/policy data remains labeled sample, and execution requests fail closed without a model call
- disposable-wallet live agent harness verifies authenticated provider responses, sourced portfolio context, sample-data boundaries, deterministic execution refusal, and test-record cleanup through `npm run agent:test:live`
- authenticated Groq agent gate passed end to end on 2026-08-28: server-side Supabase access, disposable-wallet session, provider-backed structured response, verified live portfolio provenance, sample-data boundaries, deterministic execution refusal, and cleanup all succeeded
- direct OpenAI probe returned `429 insufficient_quota`; Groq `openai/gpt-oss-20b` free tier was selected for the public testnet beta, while the paid OpenAI adapter remains available for later promotion

## Not implemented / not production-ready

- live token/protocol position readers and a selected production price provider (native-balance/provider seam exists)
- live DeFi/RWA ingestion and freshness monitoring
- durable distributed agent rate limiting, abuse monitoring, adversarial prompt evaluation, and production model/cost observability
- production integration of provider-backed simulation into an authenticated transaction route
- production protocol adapters or transaction broadcast
- configured external alert recipient and verified degraded-state alert delivery
- reviewed testnet protocol adapter, independent audits, incident controls, OKLink publication, and mainnet validation
- independent acceptance or remediation of the Base Sepolia Slither report: 8 high, 3 medium, 2 low and 1 informational results remain open; internal triage is not audit approval
- authenticated Base Sepolia RPC and independent adapter review
- resolve the Base Sepolia provider outage observed on 2026-08-19: chain metadata succeeded, but authenticated balance, bytecode and contract-call reads returned HTTP `503`
- an authoritative investable Centrifuge test vault with asset, eligibility, liquidity and exit evidence

The application is live only as a public X Layer testnet beta with production foundations. It is not a production trading agent or mainnet-ready product. Execution remains disabled.

## External production gates

- implement, review, deploy, and verify one tightly scoped protocol adapter on X Layer testnet while keeping the executor paused until approval
- promote only audited bytecode and reviewed configuration to X Layer mainnet (chain ID 196) using a separate monitored mainnet RPC and explicit launch approval
- provision separate mainnet secrets only after launch approval; never promote the testnet deployer or testnet provider configuration
- select a production-grade price-provider plan and verify fallback, rate-limit, and stale-data behavior under monitoring
- choose one current X Layer testnet lending, staking, or RWA protocol and obtain independently verified target/asset addresses before implementing its adapter; official payment USDt0 is live but does not meet the reversible-opportunity requirement
- resolve the external protocol-authority requests in `stader-labs/ethx_oft#13` and `okx/xlayer-docs#182`, then independently validate any supplied deployment before adapter work
- commission contract and adapter security audits, remediate findings, and approve deployment artifacts
- complete independent audits and invariant testing, then approve a separately funded mainnet deployer and deployment plan
- execute a capped mainnet canary with explicit user signing, verify the canonical receipt independently, and confirm the refreshed portfolio

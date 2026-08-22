# Independent security audit scope

Prepared: 2026-08-22

Status: audit evidence package in progress. The Base Sepolia V2 contracts and Aave adapter are deployed with exact source matches, but the executor remains paused and the adapter remains unapproved. This document and the internal Slither triage are not an audit report and do not represent independent approval.

## Candidate scope

- `contracts/NaviExecutorV2.sol`
- `contracts/NaviPolicyManagerV2.sol`
- `contracts/interfaces/INaviAdapterV2.sol`
- `contracts/adapters/AaveSupplyWithdrawAdapterV2.sol`
- `contracts/adapters/BoundedERC4626AdapterV2.sol`
- `contracts/interfaces/IAavePool.sol`
- `packages/simulation/src/index.ts` attestation, binding, freshness and provider evidence
- `packages/execution/src/index.ts` adapter registry, exact-transaction validation and receipt verification
- monitoring, receipt reconciliation and deployment configuration affecting execution safety

The deployed V1 contracts are excluded from promotion. They remain paused and are not evidence that V2 is deployed or audited.

## Required properties

- only explicitly approved adapter bytecode can execute
- every adapter accepts calls only from its immutable executor
- user identity, strategy, exact transaction, current policy commitment, simulation hash, chain, block and expiry remain bound
- simulation hashes cannot be replayed for the same user
- expired, stale-policy, wrong-network, altered-target, altered-calldata and altered-value actions fail closed
- token/native value cannot exceed adapter-specific limits or flow to an unapproved target
- only independently confirmed canonical receipts finalize financial state
- pause, ownership transfer and adapter changes are observable and covered by incident controls

## Evidence package

Provide the source commit, clean-tree status, compiler and optimizer settings, dependency lockfile, runtime and creation bytecode hashes, constructor arguments, deployment plan, tests, static-analysis output, protocol address evidence and known limitations. Run `npm.cmd run validate` and the GitHub `Security gates` workflow against the frozen commit.

The `Security gates` workflow publishes `navi-audit-manifest-<commit>` for 90 days. The manifest binds the candidate source files, compiler settings and lockfile to the exact clean commit. The production-only npm audit reported zero vulnerabilities on 2026-08-17. The complete dependency audit reported 11 low-severity findings confined to the Hardhat development and verification dependency graph through ethers v5 and `elliptic`; npm offered no complete upstream fix. These tools are not shipped in the Next.js runtime, but the advisory remains part of the auditor's supply-chain scope.

## Independent acceptance

An auditor with no authorship role must review the frozen source and selected adapter, publish a report tied to the exact commit and bytecode, and verify remediation of all critical and high findings. Automated tests and Slither are inputs to that review, not substitutes for it.

## Open release blockers

- no current authoritative X Layer testnet reversible opportunity protocol deployment has passed gate 3
- the deployed Base Sepolia Aave adapter has not received independent review
- no investable Centrifuge test vault has been identified; its adapter remains code-only
- no production adapter exists
- V2 has not been independently audited
- the deployed executor owner is not a reviewed multisig
- no external alert recipient is provisioned; the authenticated probe is scheduled independently every 15 minutes and persists failures

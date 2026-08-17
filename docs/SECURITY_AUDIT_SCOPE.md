# Independent security audit scope

Prepared: 2026-08-17

Status: audit-ready foundation in progress. Remote monitoring is active, but the adapter scope cannot be frozen before Gate 3 selects an eligible protocol. This document is not an audit report and does not represent independent approval.

## Candidate scope

- `contracts/NaviExecutorV2.sol`
- `contracts/NaviPolicyManagerV2.sol`
- `contracts/interfaces/INaviAdapterV2.sol`
- the selected protocol adapter and its protocol interfaces once gate 3 is satisfied
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

## Independent acceptance

An auditor with no authorship role must review the frozen source and selected adapter, publish a report tied to the exact commit and bytecode, and verify remediation of all critical and high findings. Automated tests and Slither are inputs to that review, not substitutes for it.

## Open release blockers

- no current authoritative X Layer testnet reversible opportunity protocol deployment has passed gate 3
- no production adapter exists
- V2 has not been independently audited or deployed
- the deployed executor owner is not a reviewed multisig
- no external alert recipient is provisioned; the authenticated probe is scheduled independently every 15 minutes and persists failures

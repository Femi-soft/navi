# Contract review

Reviewed: 2026-08-15

Scope: `NaviPolicyManager`, `NaviExecutor`, testnet deployment configuration, and deployment scripts. This is an internal engineering review, not an independent security audit.

## Remediated findings

### Critical: target and selector approvals formed an unsafe cross-product

The scaffold stored approved targets and approved selectors independently. Approving selector A for one target and selector B for another implicitly allowed both selectors on both targets.

The executor now calls only contracts on a reviewed adapter allowlist. Protocol targets, selectors, assets, and amount limits belong inside each protocol-specific adapter and must be reviewed together.

### High: arbitrary protocol calls bypassed the adapter boundary

The scaffold called arbitrary approved protocol targets directly. The executor now invokes the fixed `INaviAdapter.execute(user, adapterData, strategyId)` boundary and passes the initiating user explicitly.

### High: missing emergency and administration controls

The executor now deploys paused, begins with an empty adapter allowlist, uses two-step ownership transfer, rejects EOAs as adapters, and includes OpenZeppelin pause and reentrancy protection.

### Medium: insufficient execution evidence

Execution events now bind the user, adapter, strategy ID, and adapter-data hash. This improves reconciliation but does not prove that an offchain simulation was fresh or policy-compliant.

## Residual blockers

- No production protocol adapter exists. The executor must remain paused until one adapter's target addresses, selectors, assets, amount bounds, and user-authorization behavior are independently reviewed.
- Simulation freshness and policy evidence are not verified onchain. The backend must continue to fail closed, and a production design must decide whether signed or onchain attestations are required.
- Ownership is still a single deployment account. Testnet may use a dedicated account; mainnet requires reviewed multisig or governance controls and an incident-response process.
- Policy hashes depend on canonical offchain serialization and domain separation. Those rules must be specified and tested before onchain commitments become authoritative evidence.
- The contracts have not been independently audited, formally verified, fuzzed at scale, or deployed.

## Deployment posture

Hardhat Ignition deploys `NaviPolicyManager` and a paused `NaviExecutor` with no adapters. The testnet launcher refuses the wrong chain and requires an explicit testnet-only acknowledgement. A deployment does not enable transaction execution.

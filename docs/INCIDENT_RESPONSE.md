# Incident response

This runbook applies to NAVI monitoring, simulation, adapters and executor contracts. Testnet and mainnet incidents must remain operationally separate.

## Severity triggers

- Critical: unexpected executor unpause, unknown approved adapter, owner change, confirmed unauthorized execution, or loss of funds
- High: simulation-attestation bypass, receipt reconciliation conflict, missing deployed bytecode, stale chain data accepted, or provider compromise
- Medium: RPC outage, delayed receipts, monitoring/alert failure, repeated provider errors, or stale price/opportunity data

## Immediate containment

1. Pause the affected executor from the approved owner or multisig.
2. Revoke the affected adapter while preserving the transaction receipt.
3. Disable transaction preparation and broadcast at the server feature gate.
4. Rotate compromised RPC, webhook, session or simulation-attestation credentials. Never reuse testnet secrets on mainnet.
5. Preserve RPC responses, block hashes, transaction receipts, simulation attestations, policy commitments, relevant logs and deployment artifacts.

## Investigation

Confirm chain ID and canonical receipts through an independent provider. Compare deployed runtime bytecode with the frozen audit manifest. Reconcile `ActionExecuted`, adapter approval, pause and ownership events from the last known healthy block. Treat submitted transactions and client state as unverified until canonical receipts are independently observed.

## Recovery gate

Execution stays paused until root cause and blast radius are documented, affected credentials are rotated, fixes pass validation and security tests, monitoring is healthy, and an independent reviewer approves the exact deployment artifact. A new independent audit is required when the fix changes audited trust boundaries or bytecode.

## Communications

The incident lead records timestamps in UTC, affected chain and contracts, known transaction hashes, user impact, containment status and next update time. Do not claim funds or portfolio state are restored until provider-backed reconciliation and canonical receipts prove it.

## Required ownership before mainnet

Assign named primary and backup incident leads, a reviewed multisig signer set, alert recipients, provider escalation contacts and an external security contact. Test pause, adapter revocation, credential rotation and recovery in a testnet exercise before launch.

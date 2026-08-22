# Slither triage

Reviewed: 2026-08-22

Status: internal triage only. This is not an independent audit or release approval. The executor remains paused and the deployed Aave adapter remains unapproved.

## Reproducible scan

- Slither: `0.11.6`
- base image: `trailofbits/eth-security-toolbox@sha256:365282b8d03ab03f387fefadbcf3858e82d967597e90a17cf4879b3efb475764`
- pinned image definition: `security/slither.Dockerfile`
- committed report: `security/reports/slither-0.11.6.json`
- report SHA-256: `e3b31df430566cdad0950ceb50237606b81124142a53742557c874f45249b24d`
- result: 8 high, 3 medium, 2 low and 1 informational detector results

The report completed successfully but the command failed its `--fail-high` release policy. No detector was suppressed.

## Internal assessment

### Arbitrary `transferFrom` - high

Slither reports four arbitrary-source transfers across the Aave and code-only ERC-4626 adapters. Each adapter accepts calls only from its immutable executor. `NaviExecutorV2.execute` passes its authenticated `msg.sender` as the adapter user while enforcing pause state, adapter approval, current policy, unused simulation evidence and a deadline. The transfer source is therefore intended to be the authorizing executor caller, not an adapter-selected address.

Independent acceptance required: confirm the cross-contract identity binding, allowance assumptions and absence of any alternate executor call path. These findings remain open until then.

### Balance-based reentrancy - high

Slither reports four balance reads spanning external Aave/ERC-4626 calls. The only adapter entry point rejects every caller except the immutable executor, and the executor invokes it from a `nonReentrant` function. A callback cannot directly re-enter the adapter as the executor, and callback entry through the executor is blocked by its guard.

Independent acceptance required: review token and protocol callback behavior, approval changes, cross-contract reentrancy and the post-call zero-custody assertions. These findings remain open until then.

### Locked native value - medium

Both adapters implement the payable interface but immediately reject nonzero `msg.value`. There is deliberately no native-value rescue path. Forced ETH is possible at the EVM level but cannot be introduced through the reviewed execution path and does not affect adapter accounting.

### Uninitialized ERC-4626 output - medium

`outputAmount` is assigned in both supported action branches; every other action reverts before the value is used. The ERC-4626 adapter is code-only and is not deployed or eligible for approval.

### Reentrancy event ordering - low

Events are emitted only after the protocol call and post-call custody checks. This alert shares the same cross-contract review requirement as the high reentrancy findings.

### Missing V1 inheritance - informational

The finding targets the non-promotable V1 executor, which remains paused and outside the Base Sepolia V2 release candidate.

## Gate outcome

Internal automated evidence is complete, but the independent-review gate is blocked. An unaffiliated reviewer must accept or remediate every high finding against the exact manifest and deployed bytecode before adapter approval, executor unpausing or a canary transaction.

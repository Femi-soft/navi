# Protocol selection gate

Reviewed: 2026-08-17

Status: blocked. No financial protocol adapter is approved or deployed. The X Layer testnet executor remains paused with an empty allowlist.

## Acceptance criteria

A protocol is eligible only when all of the following are independently established for current X Layer testnet chain ID 1952:

- official protocol documentation identifies the deployment and network
- RPC reads confirm bytecode at every target and asset address
- verified source or reproducible bytecode is available
- the exact target, selectors, assets, value and amount bounds can be fixed in one adapter
- the protocol action preserves the initiating user and has a documented exit path
- protocol audit reports cover the deployed implementation or an exact matching commit

## Evidence reviewed

### Stader ETHx

Stader's official `ethx_oft` repository publishes an X Layer testnet pool and token address set. On 2026-08-17, NAVI queried those addresses through the configured QuickNode chain-1952 endpoint. The pool, ETHx token and OFT addresses all returned empty bytecode. The published deployment is stale and is rejected.

### Uniswap

Uniswap's official deployment registry documents X Layer mainnet chain 196, but does not document an official chain-1952 deployment. Community testnet deployments are not an authoritative protocol address source and are rejected for NAVI's allowlist.

### X Layer Builder Codes

The official testnet registry at `0x33907e98d7392d95212b05ab03f091e02d7815bf` has bytecode on chain 1952. Its documented `registerAuto()` flow depends on the connected wallet being the direct caller. Calling through a NAVI adapter would change caller identity, so this is not a valid adapter canary.

### X Layer payment USDt0

OKX's official payment documentation identifies USDt0 at `0x9e29b3aada05bf2d2c827af80bd28dc0b9b4fb0c` on X Layer testnet. At block `38523278`, the configured chain-1952 provider returned a 1,528-byte proxy runtime with hash `0xd75579a121bb5f3f6f5e171f50992d321a99630a8137fdc5d3f901a3be7a2d0c`. Its EIP-1967 implementation was `0x73406f06efcbfabd8437196abd8a213b26452510`, with a 14,659-byte runtime hash of `0x0fd1d360976e48bcd7c714a232250189602ae7d50d20cac321887b1d0ae9aa36`. RPC metadata returned name and symbol `USDt0`, six decimals, and live supply.

This is a verified testnet payment asset, not evidence of a lending, staking, or RWA opportunity. A direct token payment is irreversible and does not meet NAVI's required protocol exit path. The deployment also remains upgradeable, and the reviewed public audit material has not yet been matched to this exact implementation bytecode. It is retained as a payment-integration candidate and is not approved for the DeFi adapter allowlist.

### X Layer testnet WETH

X Layer's official contract table lists testnet WETH at `0xBec7859BC3d0603BeC454F7194173E36BF2Aa5C8`. The configured chain-1952 provider returned empty bytecode at block `38522101`, so the published testnet entry is stale and cannot provide a reversible wrap/unwrap canary.

## Unblock evidence

Record the selected protocol, official source URLs, chain ID, targets, runtime bytecode hashes, proxy implementations and admins, assets and decimals, selectors, limits, audit scope and RPC retrieval timestamp here. A reviewer other than the implementer must sign off before adapter implementation or deployment.

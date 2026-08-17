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

## Unblock evidence

Record the selected protocol, official source URLs, chain ID, targets, runtime bytecode hashes, proxy implementations and admins, assets and decimals, selectors, limits, audit scope and RPC retrieval timestamp here. A reviewer other than the implementer must sign off before adapter implementation or deployment.

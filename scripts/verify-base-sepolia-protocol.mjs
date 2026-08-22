import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createPublicClient, getAddress, http, keccak256 } from "viem";

const CHAIN_ID = 84532;
const REGISTRY_COMMIT = "dd5a718d6739342882dd3327739dc037c4fd0028";
const POOL_PROVIDER = getAddress("0xE4C23309117Aa30342BFaae6c95c6478e0A4Ad00");
const POOL = getAddress("0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27");
const DATA_PROVIDER = getAddress("0xBc9f5b7E248451CdD7cA54e717a2BFe1F32b566b");
const USDC = getAddress("0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f");
const A_USDC = getAddress("0x10F1A9D11CDf50041f3f8cB7191CBE2f31750ACC");
const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const ADMIN_SLOT = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";

const addressAbi = (name) => [{
  type: "function",
  name,
  stateMutability: "view",
  inputs: [],
  outputs: [{ type: "address" }],
}];
const metadataAbi = (name, type) => [{
  type: "function",
  name,
  stateMutability: "view",
  inputs: [],
  outputs: [{ type }],
}];
const reserveTokensAbi = [{
  type: "function",
  name: "getReserveTokensAddresses",
  stateMutability: "view",
  inputs: [{ name: "asset", type: "address" }],
  outputs: [
    { name: "aTokenAddress", type: "address" },
    { name: "stableDebtTokenAddress", type: "address" },
    { name: "variableDebtTokenAddress", type: "address" },
  ],
}];

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envText = await readFile(path.join(repoRoot, "apps", "web", ".env.local"), "utf8");
const env = new Map();
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.trimStart().startsWith("#")) continue;
  const separator = line.indexOf("=");
  if (separator > 0) env.set(line.slice(0, separator), line.slice(separator + 1));
}
const usingOverride = Boolean(process.env.BASE_SEPOLIA_RPC_URL_OVERRIDE);
const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL_OVERRIDE ?? env.get("BASE_SEPOLIA_RPC_URL");
const configuredSource = env.get("BASE_SEPOLIA_RPC_SOURCE");
const evidenceSource = usingOverride || configuredSource === "BASE_DOCUMENTED_PUBLIC_FALLBACK"
  ? "BASE_DOCUMENTED_PUBLIC_FALLBACK_PROTOCOL_VERIFICATION"
  : "AUTHENTICATED_BASE_SEPOLIA_RPC_PROTOCOL_VERIFICATION";
if (!rpcUrl) throw new Error("BASE_SEPOLIA_RPC_URL_NOT_CONFIGURED");

const client = createPublicClient({ transport: http(rpcUrl) });
const slotAddress = (value) => {
  if (!value || value === "0x" || /^0x0+$/.test(value)) return null;
  return getAddress(`0x${value.slice(-40)}`);
};

try {
  const chainId = await client.getChainId();
  if (chainId !== CHAIN_ID) throw new Error(`WRONG_CHAIN:${chainId}`);
  const block = await client.getBlock({ blockTag: "latest" });
  const ageSeconds = Math.max(0, Math.floor(Date.now() / 1_000) - Number(block.timestamp));
  if (ageSeconds > 120) throw new Error(`STALE_BLOCK:${ageSeconds}`);

  const targets = { poolProvider: POOL_PROVIDER, pool: POOL, dataProvider: DATA_PROVIDER, usdc: USDC, aUsdc: A_USDC };
  const codeEntries = await Promise.all(Object.entries(targets).map(async ([name, address]) => {
    const code = await client.getCode({ address, blockNumber: block.number });
    if (!code || code === "0x") throw new Error(`EMPTY_CODE:${name}`);
    return [name, { address, codeBytes: (code.length - 2) / 2, codeHash: keccak256(code) }];
  }));
  const code = Object.fromEntries(codeEntries);

  const [
    providerPool,
    poolProvider,
    reserveTokens,
    usdcDecimals,
    usdcSymbol,
    aTokenAsset,
    aTokenPool,
    poolImplementationRaw,
    poolAdminRaw,
    usdcImplementationRaw,
    aTokenImplementationRaw,
  ] = await Promise.all([
    client.readContract({ address: POOL_PROVIDER, abi: addressAbi("getPool"), functionName: "getPool", blockNumber: block.number }),
    client.readContract({ address: POOL, abi: addressAbi("ADDRESSES_PROVIDER"), functionName: "ADDRESSES_PROVIDER", blockNumber: block.number }),
    client.readContract({ address: DATA_PROVIDER, abi: reserveTokensAbi, functionName: "getReserveTokensAddresses", args: [USDC], blockNumber: block.number }),
    client.readContract({ address: USDC, abi: metadataAbi("decimals", "uint8"), functionName: "decimals", blockNumber: block.number }),
    client.readContract({ address: USDC, abi: metadataAbi("symbol", "string"), functionName: "symbol", blockNumber: block.number }),
    client.readContract({ address: A_USDC, abi: addressAbi("UNDERLYING_ASSET_ADDRESS"), functionName: "UNDERLYING_ASSET_ADDRESS", blockNumber: block.number }),
    client.readContract({ address: A_USDC, abi: addressAbi("POOL"), functionName: "POOL", blockNumber: block.number }),
    client.getStorageAt({ address: POOL, slot: IMPLEMENTATION_SLOT, blockNumber: block.number }),
    client.getStorageAt({ address: POOL, slot: ADMIN_SLOT, blockNumber: block.number }),
    client.getStorageAt({ address: USDC, slot: IMPLEMENTATION_SLOT, blockNumber: block.number }),
    client.getStorageAt({ address: A_USDC, slot: IMPLEMENTATION_SLOT, blockNumber: block.number }),
  ]);

  const poolImplementation = slotAddress(poolImplementationRaw);
  const usdcImplementation = slotAddress(usdcImplementationRaw);
  const aTokenImplementation = slotAddress(aTokenImplementationRaw);
  const implementationEntries = await Promise.all(
    Object.entries({ poolImplementation, usdcImplementation, aTokenImplementation })
      .filter(([, address]) => address !== null)
      .map(async ([name, address]) => {
        const runtime = await client.getCode({ address, blockNumber: block.number });
        if (!runtime || runtime === "0x") throw new Error(`EMPTY_CODE:${name}`);
        return [name, { address, codeBytes: (runtime.length - 2) / 2, codeHash: keccak256(runtime) }];
      }),
  );

  const valid = getAddress(providerPool) === POOL
    && getAddress(poolProvider) === POOL_PROVIDER
    && getAddress(reserveTokens[0]) === A_USDC
    && Number(usdcDecimals) === 6
    && usdcSymbol === "USDC"
    && getAddress(aTokenAsset) === USDC
    && getAddress(aTokenPool) === POOL;
  if (!valid) throw new Error("PROTOCOL_INVARIANT_FAILED");

  console.log(JSON.stringify({
    chainId,
    blockNumber: block.number.toString(),
    blockTimestamp: new Date(Number(block.timestamp) * 1_000).toISOString(),
    blockAgeSeconds: ageSeconds,
    registryCommit: REGISTRY_COMMIT,
    code,
    relationships: {
      providerPool,
      poolProvider,
      reserveAToken: reserveTokens[0],
      reserveStableDebtToken: reserveTokens[1],
      reserveVariableDebtToken: reserveTokens[2],
      usdcDecimals: Number(usdcDecimals),
      usdcSymbol,
      aTokenAsset,
      aTokenPool,
    },
    proxies: {
      pool: { implementation: poolImplementation, admin: slotAddress(poolAdminRaw) },
      usdc: { implementation: usdcImplementation },
      aUsdc: { implementation: aTokenImplementation },
    },
    implementations: Object.fromEntries(implementationEntries),
    verified: true,
    source: evidenceSource,
    retrievedAt: new Date().toISOString(),
  }, null, 2));
} catch (error) {
  const safeError = error instanceof Error
      && /^(WRONG_CHAIN|STALE_BLOCK|EMPTY_CODE|PROTOCOL_INVARIANT_FAILED)/.test(error.message)
    ? error.message
    : "BASE_SEPOLIA_PROTOCOL_VERIFICATION_FAILED";
  console.error(JSON.stringify({
    chainId: CHAIN_ID,
    status: "UNVERIFIED",
    error: safeError,
    source: evidenceSource,
    retrievedAt: new Date().toISOString(),
  }));
  process.exitCode = 1;
}

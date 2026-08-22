import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createPublicClient, formatEther, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

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
const usingPublicFallback = usingOverride || env.get("BASE_SEPOLIA_RPC_SOURCE") === "BASE_DOCUMENTED_PUBLIC_FALLBACK";
const privateKey = env.get("BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY");
if (!rpcUrl) throw new Error("BASE_SEPOLIA_RPC_URL_NOT_CONFIGURED");
if (!privateKey?.match(/^0x[0-9a-fA-F]{64}$/)) throw new Error("BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY_NOT_CONFIGURED");

const account = privateKeyToAccount(privateKey);
const client = createPublicClient({ transport: http(rpcUrl) });

try {
  const chainId = await client.getChainId();
  if (chainId !== 84532) throw new Error(`WRONG_CHAIN:${chainId}`);
  const [balanceWei, latestBlock] = await Promise.all([
    client.getBalance({ address: account.address }),
    client.getBlock({ blockTag: "latest" }),
  ]);
  console.log(JSON.stringify({
    chainId,
    address: account.address,
    balanceWei: balanceWei.toString(),
    balanceEth: formatEther(balanceWei),
    funded: balanceWei > 0n,
    latestBlock: latestBlock.number.toString(),
    source: usingPublicFallback ? "BASE_DOCUMENTED_PUBLIC_FALLBACK_NATIVE_BALANCE" : "AUTHENTICATED_BASE_SEPOLIA_RPC_NATIVE_BALANCE",
    retrievedAt: new Date().toISOString(),
  }, null, 2));
} catch (error) {
  const safeError = error instanceof Error && error.message.startsWith("WRONG_CHAIN:")
    ? error.message
    : "BASE_SEPOLIA_RPC_REQUEST_FAILED";
  console.error(JSON.stringify({
    chainId: 84532,
    address: account.address,
    status: "UNVERIFIED",
    error: safeError,
    source: usingPublicFallback ? "BASE_DOCUMENTED_PUBLIC_FALLBACK_NATIVE_BALANCE" : "AUTHENTICATED_BASE_SEPOLIA_RPC_NATIVE_BALANCE",
    retrievedAt: new Date().toISOString(),
  }));
  process.exitCode = 1;
}

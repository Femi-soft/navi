import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createPublicClient, formatEther, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(repoRoot, "apps", "web", ".env.local");
const values = new Map();

for (const line of (await readFile(envPath, "utf8")).split(/\r?\n/)) {
  if (!line || line.trimStart().startsWith("#")) continue;
  const separator = line.indexOf("=");
  if (separator > 0) values.set(line.slice(0, separator), line.slice(separator + 1));
}

const rpcUrl = values.get("X_LAYER_TESTNET_RPC_URL");
const privateKey = values.get("DEPLOYER_PRIVATE_KEY");
if (!rpcUrl) throw new Error("X_LAYER_TESTNET_RPC_URL_NOT_CONFIGURED");
if (!privateKey?.match(/^0x[0-9a-fA-F]{64}$/)) throw new Error("DEPLOYER_PRIVATE_KEY_NOT_CONFIGURED");

const address = privateKeyToAccount(privateKey).address;
const client = createPublicClient({ transport: http(rpcUrl) });

try {
  const chainId = await client.getChainId();
  if (chainId !== 1952) throw new Error(`WRONG_CHAIN:${chainId}`);

  const balanceWei = await client.getBalance({ address });
  console.log(JSON.stringify({
    chainId,
    address,
    balanceWei: balanceWei.toString(),
    balanceOkb: formatEther(balanceWei),
    funded: balanceWei > 0n,
    source: "X_LAYER_TESTNET_RPC_NATIVE_BALANCE",
    retrievedAt: new Date().toISOString(),
  }));
} catch (error) {
  const code = error instanceof Error && error.message.startsWith("WRONG_CHAIN:")
    ? error.message
    : "TESTNET_RPC_REQUEST_FAILED";

  console.error(JSON.stringify({
    chainId: 1952,
    address,
    status: "UNVERIFIED",
    error: code,
    source: "LOCAL_RPC_PROBE",
    retrievedAt: new Date().toISOString(),
  }));
  process.exitCode = 1;
}

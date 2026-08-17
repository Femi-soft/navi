import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(repoRoot, "apps", "web", ".env.local");
const publicRecordPath = path.join(repoRoot, "deployments", "xlayer-testnet-deployer.json");

const envText = await readFile(envPath, "utf8");
const lines = envText.split(/\r?\n/).filter((line, index, all) => line.length > 0 || index < all.length - 1);
const existingIndex = lines.findIndex((line) => line.startsWith("DEPLOYER_PRIVATE_KEY="));
const existingValue = existingIndex >= 0 ? lines[existingIndex].slice("DEPLOYER_PRIVATE_KEY=".length).trim() : "";

if (existingValue) {
  throw new Error("DEPLOYER_PRIVATE_KEY_ALREADY_CONFIGURED");
}

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);
const privateKeyLine = `DEPLOYER_PRIVATE_KEY=${privateKey}`;

if (existingIndex >= 0) {
  lines[existingIndex] = privateKeyLine;
} else {
  lines.push(privateKeyLine);
}

await writeFile(envPath, `${lines.join("\n")}\n`, "utf8");

const createdAt = new Date().toISOString();
await writeFile(
  publicRecordPath,
  `${JSON.stringify({
    chainId: 1952,
    address: account.address,
    purpose: "NAVI_X_LAYER_TESTNET_DEPLOYER",
    status: "UNFUNDED",
    source: "LOCAL_VIEM_CSPRNG",
    retrievedAt: createdAt,
  }, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({ chainId: 1952, address: account.address, status: "UNFUNDED", createdAt }));

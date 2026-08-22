import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(repoRoot, "apps", "web", ".env.local");
const publicRecordPath = path.join(repoRoot, "deployments", "base-sepolia-deployer.json");
const keyName = "BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY";

const envText = await readFile(envPath, "utf8");
const lines = envText.split(/\r?\n/).filter((line, index, all) => line.length > 0 || index < all.length - 1);
const existingIndex = lines.findIndex((line) => line.startsWith(`${keyName}=`));
const existingValue = existingIndex >= 0 ? lines[existingIndex].slice(keyName.length + 1).trim() : "";

if (existingValue) throw new Error("BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY_ALREADY_CONFIGURED");

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);
const privateKeyLine = `${keyName}=${privateKey}`;

if (existingIndex >= 0) lines[existingIndex] = privateKeyLine;
else lines.push(privateKeyLine);

await writeFile(envPath, `${lines.join("\n")}\n`, "utf8");

const retrievedAt = new Date().toISOString();
await writeFile(
  publicRecordPath,
  `${JSON.stringify({
    chainId: 84532,
    address: account.address,
    purpose: "NAVI_BASE_SEPOLIA_DEPLOYER",
    status: "UNFUNDED",
    source: "LOCAL_VIEM_CSPRNG",
    retrievedAt,
  }, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({ chainId: 84532, address: account.address, status: "UNFUNDED", retrievedAt }));

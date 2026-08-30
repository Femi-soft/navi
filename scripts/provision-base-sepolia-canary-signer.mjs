import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(repoRoot, "apps", "web", ".env.local");
const publicRecordPath = path.join(repoRoot, "deployments", "base-sepolia-canary-signer.json");
const addressKey = "BASE_SEPOLIA_SIMULATION_SIGNER_ADDRESS";
const privateKeyName = "BASE_SEPOLIA_SIMULATION_SIGNER_PRIVATE_KEY";
const deployerKeyName = "BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY";

const envText = await readFile(envPath, "utf8");
const lines = envText.split(/\r?\n/).filter((line, index, all) => line.length > 0 || index < all.length - 1);
const readValue = (name) => {
  const line = lines.find((candidate) => candidate.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim() ?? "";
};
const addressValue = readValue(addressKey);
const privateKeyValue = readValue(privateKeyName);
const deployerPrivateKey = readValue(deployerKeyName);
if (addressValue || privateKeyValue) throw new Error("BASE_SEPOLIA_SIMULATION_SIGNER_ALREADY_CONFIGURED");
if (!/^0x[0-9a-fA-F]{64}$/.test(deployerPrivateKey)) throw new Error("BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY_NOT_CONFIGURED");

const deployer = privateKeyToAccount(deployerPrivateKey);
let privateKey = generatePrivateKey();
let signer = privateKeyToAccount(privateKey);
while (signer.address.toLowerCase() === deployer.address.toLowerCase()) {
  privateKey = generatePrivateKey();
  signer = privateKeyToAccount(privateKey);
}

for (const [name, value] of [[addressKey, signer.address], [privateKeyName, privateKey]]) {
  const index = lines.findIndex((line) => line.startsWith(`${name}=`));
  const entry = `${name}=${value}`;
  if (index >= 0) lines[index] = entry;
  else lines.push(entry);
}
await writeFile(envPath, `${lines.join("\n")}\n`, "utf8");

const retrievedAt = new Date().toISOString();
await writeFile(publicRecordPath, `${JSON.stringify({
  chainId: 84532,
  address: signer.address,
  purpose: "NAVI_BASE_SEPOLIA_CANARY_EVIDENCE_SIGNER",
  status: "TESTNET_ONLY_OFFCHAIN_SIGNER",
  source: "LOCAL_VIEM_CSPRNG",
  retrievedAt,
}, null, 2)}\n`, "utf8");

console.log(JSON.stringify({ chainId:84532, address:signer.address, deployerAddress:deployer.address, distinctFromDeployer:true, status:"TESTNET_ONLY_OFFCHAIN_SIGNER", retrievedAt }, null, 2));

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

const rpcUrl = env.get("X_LAYER_TESTNET_RPC_URL");
const privateKey = env.get("DEPLOYER_PRIVATE_KEY");
if (!rpcUrl) throw new Error("X_LAYER_TESTNET_RPC_URL_NOT_CONFIGURED");
if (!privateKey?.match(/^0x[0-9a-fA-F]{64}$/)) throw new Error("DEPLOYER_PRIVATE_KEY_NOT_CONFIGURED");

const deploymentDir = path.join(repoRoot, "ignition", "deployments", "chain-1952");
const addresses = JSON.parse(await readFile(path.join(deploymentDir, "deployed_addresses.json"), "utf8"));
const executorAddress = addresses["NaviModule#NaviExecutor"];
const policyManagerAddress = addresses["NaviModule#NaviPolicyManager"];
const executorArtifact = JSON.parse(
  await readFile(path.join(deploymentDir, "artifacts", "NaviModule#NaviExecutor.json"), "utf8"),
);
const journal = (await readFile(path.join(deploymentDir, "journal.jsonl"), "utf8"))
  .trim()
  .split(/\r?\n/)
  .map((line) => JSON.parse(line));
const confirmations = journal.filter((entry) => entry.type === "TRANSACTION_CONFIRM");

const account = privateKeyToAccount(privateKey);
const client = createPublicClient({ transport: http(rpcUrl) });

try {
  const chainId = await client.getChainId();
  if (chainId !== 1952) throw new Error(`WRONG_CHAIN:${chainId}`);
  if (confirmations.length !== 2) throw new Error(`UNEXPECTED_RECEIPT_COUNT:${confirmations.length}`);

  const [executorCode, policyManagerCode, owner, paused, deployerApproved, balanceWei, latestBlock] = await Promise.all([
    client.getBytecode({ address: executorAddress }),
    client.getBytecode({ address: policyManagerAddress }),
    client.readContract({ address: executorAddress, abi: executorArtifact.abi, functionName: "owner" }),
    client.readContract({ address: executorAddress, abi: executorArtifact.abi, functionName: "paused" }),
    client.readContract({
      address: executorAddress,
      abi: executorArtifact.abi,
      functionName: "approvedAdapters",
      args: [account.address],
    }),
    client.getBalance({ address: account.address }),
    client.getBlock({ blockTag: "latest" }),
  ]);
  const receipts = await Promise.all(confirmations.map((entry) => client.getTransactionReceipt({ hash: entry.hash })));
  const receiptChecks = receipts.map((receipt) => ({
    transactionHash: receipt.transactionHash,
    blockNumber: receipt.blockNumber.toString(),
    contractAddress: receipt.contractAddress,
    status: receipt.status,
  }));

  const verified = Boolean(executorCode && executorCode !== "0x")
    && Boolean(policyManagerCode && policyManagerCode !== "0x")
    && owner.toLowerCase() === account.address.toLowerCase()
    && paused === true
    && deployerApproved === false
    && receipts.every((receipt) => receipt.status === "success");
  if (!verified) throw new Error("DEPLOYMENT_INVARIANT_FAILED");

  console.log(JSON.stringify({
    chainId,
    deployer: account.address,
    executor: {
      address: executorAddress,
      hasBytecode: true,
      owner,
      paused,
      deployerApprovedAsAdapter: deployerApproved,
    },
    policyManager: { address: policyManagerAddress, hasBytecode: true },
    receipts: receiptChecks,
    latestBlock: latestBlock.number.toString(),
    remainingBalanceWei: balanceWei.toString(),
    remainingBalanceOkb: formatEther(balanceWei),
    verified: true,
    source: "X_LAYER_TESTNET_RPC_DEPLOYMENT_VERIFICATION",
    retrievedAt: new Date().toISOString(),
  }, null, 2));
} catch (error) {
  const safeError = error instanceof Error && /^(WRONG_CHAIN|UNEXPECTED_RECEIPT_COUNT|DEPLOYMENT_INVARIANT_FAILED)/.test(error.message)
    ? error.message
    : "TESTNET_DEPLOYMENT_VERIFICATION_FAILED";
  console.error(JSON.stringify({
    chainId: 1952,
    status: "UNVERIFIED",
    error: safeError,
    source: "LOCAL_RPC_PROBE",
    retrievedAt: new Date().toISOString(),
  }));
  process.exitCode = 1;
}

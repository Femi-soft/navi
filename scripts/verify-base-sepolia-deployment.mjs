import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createPublicClient, formatEther, getAddress, http, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const CHAIN_ID = 84532;
const EXPECTED_POOL = getAddress("0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27");
const EXPECTED_ASSET = getAddress("0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f");
const EXPECTED_A_TOKEN = getAddress("0x10F1A9D11CDf50041f3f8cB7191CBE2f31750ACC");
const EXPECTED_CAP = 1_000n * 1_000_000n;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envText = await readFile(path.join(repoRoot, "apps", "web", ".env.local"), "utf8");
const env = new Map();
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.trimStart().startsWith("#")) continue;
  const separator = line.indexOf("=");
  if (separator > 0) env.set(line.slice(0, separator), line.slice(separator + 1));
}

const rpcUrl = env.get("BASE_SEPOLIA_RPC_URL");
const privateKey = env.get("BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY");
if (!rpcUrl) throw new Error("BASE_SEPOLIA_RPC_URL_NOT_CONFIGURED");
if (!privateKey?.match(/^0x[0-9a-fA-F]{64}$/)) {
  throw new Error("BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY_NOT_CONFIGURED");
}

const deploymentDir = path.join(repoRoot, "ignition", "deployments", `chain-${CHAIN_ID}`);
const addresses = JSON.parse(await readFile(path.join(deploymentDir, "deployed_addresses.json"), "utf8"));
const executorAddress = addresses["NaviBaseSepoliaModule#NaviExecutorV2"];
const policyManagerAddress = addresses["NaviBaseSepoliaModule#NaviPolicyManagerV2"];
const adapterAddress = addresses["NaviBaseSepoliaModule#AaveSupplyWithdrawAdapterV2"];
const executorArtifact = JSON.parse(
  await readFile(path.join(deploymentDir, "artifacts", "NaviBaseSepoliaModule#NaviExecutorV2.json"), "utf8"),
);
const adapterArtifact = JSON.parse(
  await readFile(
    path.join(deploymentDir, "artifacts", "NaviBaseSepoliaModule#AaveSupplyWithdrawAdapterV2.json"),
    "utf8",
  ),
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
  if (chainId !== CHAIN_ID) throw new Error(`WRONG_CHAIN:${chainId}`);
  if (confirmations.length !== 3) throw new Error(`UNEXPECTED_RECEIPT_COUNT:${confirmations.length}`);

  const [
    executorCode,
    policyCode,
    adapterCode,
    owner,
    paused,
    adapterApproved,
    configuredPolicy,
    configuredExecutor,
    configuredPool,
    configuredAsset,
    configuredAToken,
    configuredCap,
    balanceWei,
    latestBlock,
  ] = await Promise.all([
    client.getBytecode({ address: executorAddress }),
    client.getBytecode({ address: policyManagerAddress }),
    client.getBytecode({ address: adapterAddress }),
    client.readContract({ address: executorAddress, abi: executorArtifact.abi, functionName: "owner" }),
    client.readContract({ address: executorAddress, abi: executorArtifact.abi, functionName: "paused" }),
    client.readContract({
      address: executorAddress,
      abi: executorArtifact.abi,
      functionName: "approvedAdapters",
      args: [adapterAddress],
    }),
    client.readContract({ address: executorAddress, abi: executorArtifact.abi, functionName: "policyManager" }),
    client.readContract({ address: adapterAddress, abi: adapterArtifact.abi, functionName: "executor" }),
    client.readContract({ address: adapterAddress, abi: adapterArtifact.abi, functionName: "pool" }),
    client.readContract({ address: adapterAddress, abi: adapterArtifact.abi, functionName: "asset" }),
    client.readContract({ address: adapterAddress, abi: adapterArtifact.abi, functionName: "aToken" }),
    client.readContract({ address: adapterAddress, abi: adapterArtifact.abi, functionName: "maxActionAmount" }),
    client.getBalance({ address: account.address }),
    client.getBlock({ blockTag: "latest" }),
  ]);
  const receipts = await Promise.all(
    confirmations.map((entry) => client.getTransactionReceipt({ hash: entry.hash })),
  );
  const transactions = await Promise.all(
    receipts.map((receipt) => client.getTransaction({ hash: receipt.transactionHash })),
  );

  const verified = [executorCode, policyCode, adapterCode].every((code) => Boolean(code && code !== "0x"))
    && getAddress(owner) === getAddress(account.address)
    && paused === true
    && adapterApproved === false
    && getAddress(configuredPolicy) === getAddress(policyManagerAddress)
    && getAddress(configuredExecutor) === getAddress(executorAddress)
    && getAddress(configuredPool) === EXPECTED_POOL
    && getAddress(configuredAsset) === EXPECTED_ASSET
    && getAddress(configuredAToken) === EXPECTED_A_TOKEN
    && configuredCap === EXPECTED_CAP
    && receipts.every((receipt) => receipt.status === "success");
  if (!verified) throw new Error("DEPLOYMENT_INVARIANT_FAILED");

  console.log(JSON.stringify({
    chainId,
    deployer: account.address,
    executor: { address: executorAddress, owner, paused, adapterApproved, runtimeCodeHash: keccak256(executorCode) },
    policyManager: { address: policyManagerAddress, hasBytecode: true, runtimeCodeHash: keccak256(policyCode) },
    aaveAdapter: {
      address: adapterAddress,
      executor: configuredExecutor,
      pool: configuredPool,
      asset: configuredAsset,
      aToken: configuredAToken,
      maxActionAmount: configuredCap.toString(),
      hasBytecode: true,
      runtimeCodeHash: keccak256(adapterCode),
    },
    receipts: receipts.map((receipt, index) => ({
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber.toString(),
      contractAddress: receipt.contractAddress,
      status: receipt.status,
      creationInputHash: keccak256(transactions[index].input),
    })),
    latestBlock: latestBlock.number.toString(),
    remainingBalanceWei: balanceWei.toString(),
    remainingBalanceEth: formatEther(balanceWei),
    verified: true,
    source: "BASE_SEPOLIA_RPC_DEPLOYMENT_VERIFICATION",
    retrievedAt: new Date().toISOString(),
  }, null, 2));
} catch (error) {
  const safeError = error instanceof Error
      && /^(WRONG_CHAIN|UNEXPECTED_RECEIPT_COUNT|DEPLOYMENT_INVARIANT_FAILED)/.test(error.message)
    ? error.message
    : "BASE_SEPOLIA_DEPLOYMENT_VERIFICATION_FAILED";
  console.error(JSON.stringify({
    chainId: CHAIN_ID,
    status: "UNVERIFIED",
    error: safeError,
    source: "LOCAL_RPC_PROBE",
    retrievedAt: new Date().toISOString(),
  }));
  process.exitCode = 1;
}

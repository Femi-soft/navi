import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { encodeAbiParameters, getAddress } from "viem";

const root = process.cwd();
const buildInfoDirectory = join(root, "ignition", "deployments", "chain-84532", "build-info");
const outputDirectory = join(root, "artifacts", "basescan-verification");
const addresses = JSON.parse(readFileSync(join(root, "ignition", "deployments", "chain-84532", "deployed_addresses.json"), "utf8"));

const deployer = getAddress("0xa24289448904ce7a4126448735D6fA0C7f246b72");
const policyManager = getAddress(addresses["NaviBaseSepoliaModule#NaviPolicyManagerV2"]);
const executor = getAddress(addresses["NaviBaseSepoliaModule#NaviExecutorV2"]);
const aaveAdapter = getAddress(addresses["NaviBaseSepoliaModule#AaveSupplyWithdrawAdapterV2"]);

const contracts = [
  {
    slug: "policy-manager-v2",
    sourceName: "contracts/NaviPolicyManagerV2.sol",
    contractName: "NaviPolicyManagerV2",
    address: policyManager,
    constructorArguments: "",
  },
  {
    slug: "executor-v2",
    sourceName: "contracts/NaviExecutorV2.sol",
    contractName: "NaviExecutorV2",
    address: executor,
    constructorArguments: encodeAbiParameters(
      [{ type: "address" }, { type: "address" }],
      [deployer, policyManager],
    ).slice(2),
  },
  {
    slug: "aave-adapter-v2",
    sourceName: "contracts/adapters/AaveSupplyWithdrawAdapterV2.sol",
    contractName: "AaveSupplyWithdrawAdapterV2",
    address: aaveAdapter,
    constructorArguments: encodeAbiParameters(
      [
        { type: "address" },
        { type: "address" },
        { type: "address" },
        { type: "address" },
        { type: "uint256" },
      ],
      [
        executor,
        getAddress("0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27"),
        getAddress("0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f"),
        getAddress("0x10F1A9D11CDf50041f3f8cB7191CBE2f31750ACC"),
        1_000_000_000n,
      ],
    ).slice(2),
  },
];

const buildInfo = readdirSync(buildInfoDirectory)
  .filter((name) => name.endsWith(".json") && !name.endsWith(".output.json"))
  .map((name) => JSON.parse(readFileSync(join(buildInfoDirectory, name), "utf8")));

mkdirSync(outputDirectory, { recursive: true });

const manifest = contracts.map((contract) => {
  const info = buildInfo.find((candidate) => Object.hasOwn(candidate.userSourceNameMap, contract.sourceName));
  if (!info) throw new Error(`Missing Ignition build information for ${contract.sourceName}`);
  const compilerSourceName = info.userSourceNameMap[contract.sourceName];
  const inputFile = `${contract.slug}-standard-input.json`;
  writeFileSync(join(outputDirectory, inputFile), `${JSON.stringify(info.input, null, 2)}\n`, "utf8");
  return {
    ...contract,
    chainId: 84532,
    compilerType: "Solidity (Standard-Json-Input)",
    compilerVersion: `v${info.solcLongVersion}`,
    license: "MIT",
    compilerContractName: `${compilerSourceName}:${contract.contractName}`,
    inputFile,
  };
});

writeFileSync(join(outputDirectory, "manifest.json"), `${JSON.stringify({ contracts: manifest }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputDirectory, contracts: manifest }, null, 2));

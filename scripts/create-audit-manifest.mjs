import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const files=[
  "contracts/NaviExecutorV2.sol",
  "contracts/NaviPolicyManagerV2.sol",
  "contracts/adapters/AaveSupplyWithdrawAdapterV2.sol",
  "contracts/adapters/BoundedERC4626AdapterV2.sol",
  "contracts/interfaces/IAavePool.sol",
  "contracts/interfaces/INaviAdapterV2.sol",
  "contracts/interfaces/INaviPolicyManagerV2.sol",
  "ignition/modules/NaviBaseSepolia.ts",
  "ignition/deployments/chain-84532/deployed_addresses.json",
  "scripts/verify-base-sepolia-deployment.mjs",
  "scripts/verify-base-sepolia-protocol.mjs",
  "security/slither.Dockerfile",
  "security/reports/slither-0.11.6.json",
  "test/contracts/NaviContracts.ts",
  "packages/simulation/src/index.ts",
  "packages/execution/src/index.ts",
  "apps/web/lib/server/monitoring.ts",
  "hardhat.config.ts",
  "package-lock.json",
  "docs/BASE_SEPOLIA_DEPLOYMENT.md",
  "docs/SECURITY_AUDIT_SCOPE.md",
  "docs/SLITHER_TRIAGE.md",
];

const hashes={};
for (const file of files) hashes[file]=createHash("sha256").update(await readFile(file)).digest("hex");
const commit=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
const worktree=execFileSync("git",["status","--short"],{encoding:"utf8"}).trim();
const deploymentAddresses=JSON.parse(await readFile("ignition/deployments/chain-84532/deployed_addresses.json"));
console.log(JSON.stringify({
  schemaVersion:1,
  generatedAt:new Date().toISOString(),
  source:"NAVI_LOCAL_AUDIT_MANIFEST",
  commit,
  cleanWorktree:worktree.length===0,
  worktreeStatus:worktree ? worktree.split(/\r?\n/) : [],
  compiler:{solidity:"0.8.24",optimizer:true,runs:200,evmTarget:"shanghai"},
  deployment:{chainId:84532,addresses:deploymentAddresses},
  files:hashes,
},null,2));

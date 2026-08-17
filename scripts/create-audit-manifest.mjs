import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const files=[
  "contracts/NaviExecutorV2.sol",
  "contracts/NaviPolicyManagerV2.sol",
  "contracts/interfaces/INaviAdapterV2.sol",
  "contracts/interfaces/INaviPolicyManagerV2.sol",
  "packages/simulation/src/index.ts",
  "packages/execution/src/index.ts",
  "apps/web/lib/server/monitoring.ts",
  "hardhat.config.ts",
  "package-lock.json",
];

const hashes={};
for (const file of files) hashes[file]=createHash("sha256").update(await readFile(file)).digest("hex");
const commit=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
const worktree=execFileSync("git",["status","--short"],{encoding:"utf8"}).trim();
console.log(JSON.stringify({
  schemaVersion:1,
  generatedAt:new Date().toISOString(),
  source:"NAVI_LOCAL_AUDIT_MANIFEST",
  commit,
  cleanWorktree:worktree.length===0,
  compiler:{solidity:"0.8.24",optimizer:true,runs:200,evmTarget:"shanghai"},
  files:hashes,
},null,2));

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { keccak256, stringToHex } from "viem";

describe("NAVI contracts", async function () {
  const { viem } = await network.create();

  it("versions policy commitments per user and rejects empty hashes", async function () {
    const [, user] = await viem.getWalletClients();
    const policy = await viem.deployContract("NaviPolicyManager");
    const firstHash = keccak256(stringToHex("policy-v1"));
    const secondHash = keccak256(stringToHex("policy-v2"));

    await assert.rejects(policy.write.commit([`0x${"00".repeat(32)}`], { account: user.account }));
    await policy.write.commit([firstHash], { account: user.account });
    await policy.write.commit([secondHash], { account: user.account });

    const commitment = await policy.read.commitments([user.account.address]);
    assert.equal(commitment[0], secondHash);
    assert.equal(commitment[1], 2n);
  });

  it("deploys the executor paused with no approved adapters", async function () {
    const [owner, user] = await viem.getWalletClients();
    const executor = await viem.deployContract("NaviExecutor", [owner.account.address]);

    assert.equal(await executor.read.paused(), true);
    assert.equal(await executor.read.approvedAdapters([user.account.address]), false);
    await assert.rejects(executor.write.setAdapter([user.account.address, true]));
    await assert.rejects(executor.write.setAdapter([user.account.address, false], { account: user.account }));
    await assert.rejects(executor.write.unpause({ account: user.account }));
  });

  it("routes only through an approved adapter and preserves the user identity", async function () {
    const [owner, user] = await viem.getWalletClients();
    const executor = await viem.deployContract("NaviExecutor", [owner.account.address]);
    const adapter = await viem.deployContract("MockNaviAdapter");
    const adapterData = stringToHex("reviewed-adapter-call");
    const strategyId = keccak256(stringToHex("strategy-1"));

    await executor.write.setAdapter([adapter.address, true]);
    await executor.write.unpause();
    await executor.write.execute([adapter.address, adapterData, strategyId], { account: user.account });

    assert.equal((await adapter.read.lastUser()).toLowerCase(), user.account.address.toLowerCase());
    assert.equal(await adapter.read.lastDataHash(), keccak256(adapterData));
    assert.equal(await adapter.read.lastStrategyId(), strategyId);
  });

  it("blocks execution while paused, for unapproved adapters, and for empty strategy IDs", async function () {
    const [owner, user] = await viem.getWalletClients();
    const executor = await viem.deployContract("NaviExecutor", [owner.account.address]);
    const adapter = await viem.deployContract("MockNaviAdapter");
    const strategyId = keccak256(stringToHex("strategy-2"));

    await assert.rejects(
      executor.write.execute([adapter.address, "0x", strategyId], { account: user.account }),
    );
    await executor.write.setAdapter([adapter.address, true]);
    await executor.write.unpause();
    await assert.rejects(
      executor.write.execute([adapter.address, "0x", `0x${"00".repeat(32)}`], { account: user.account }),
    );
    await executor.write.pause();
    await assert.rejects(
      executor.write.execute([adapter.address, "0x", strategyId], { account: user.account }),
    );
  });

  it("requires the pending owner to accept ownership", async function () {
    const [owner, nextOwner] = await viem.getWalletClients();
    const executor = await viem.deployContract("NaviExecutor", [owner.account.address]);

    await executor.write.transferOwnership([nextOwner.account.address]);
    assert.equal((await executor.read.owner()).toLowerCase(), owner.account.address.toLowerCase());
    assert.equal(
      (await executor.read.pendingOwner()).toLowerCase(),
      nextOwner.account.address.toLowerCase(),
    );
    await executor.write.acceptOwnership({ account: nextOwner.account });
    assert.equal((await executor.read.owner()).toLowerCase(), nextOwner.account.address.toLowerCase());
  });

  it("binds V2 execution to current policy, unused simulation evidence, deadline, and value", async function () {
    const [owner, user] = await viem.getWalletClients();
    const policy = await viem.deployContract("NaviPolicyManagerV2");
    const executor = await viem.deployContract("NaviExecutorV2", [owner.account.address, policy.address]);
    const adapter = await viem.deployContract("MockNaviAdapterV2", [executor.address]);
    const documentHash = keccak256(stringToHex("canonical-policy-v1"));
    const strategyId = keccak256(stringToHex("strategy-v2"));
    const simulationHash = keccak256(stringToHex("signed-provider-simulation"));
    await policy.write.commit([documentHash], { account:user.account });
    const commitment = await policy.read.commitments([user.account.address]);
    await executor.write.setAdapter([adapter.address,true]);
    await executor.write.unpause();
    const deadline=BigInt(Math.floor(Date.now()/1_000)+300);
    const args=[adapter.address,stringToHex("bounded-call"),{strategyId,simulationHash,policyCommitmentHash:commitment[1],policyVersion:commitment[2],deadline}] as const;
    await executor.write.execute(args,{ account:user.account,value:123n });
    assert.equal((await adapter.read.lastUser()).toLowerCase(),user.account.address.toLowerCase());
    assert.equal(await adapter.read.lastValue(),123n);
    assert.equal(await executor.read.consumedSimulations([user.account.address,simulationHash]),true);
    await assert.rejects(executor.write.execute(args,{ account:user.account,value:123n }));
  });

  it("fails V2 closed for stale policy, expired evidence, and direct adapter calls", async function () {
    const [owner,user] = await viem.getWalletClients();
    const policy = await viem.deployContract("NaviPolicyManagerV2");
    const executor = await viem.deployContract("NaviExecutorV2", [owner.account.address,policy.address]);
    const adapter = await viem.deployContract("MockNaviAdapterV2", [executor.address]);
    const first=keccak256(stringToHex("policy-1"));
    await policy.write.commit([first],{account:user.account});
    const stale=await policy.read.commitments([user.account.address]);
    await policy.write.commit([keccak256(stringToHex("policy-2"))],{account:user.account});
    await executor.write.setAdapter([adapter.address,true]);
    await executor.write.unpause();
    const strategyId=keccak256(stringToHex("strategy"));
    const simulationHash=keccak256(stringToHex("simulation"));
    const common=[adapter.address,"0x"] as const;
    await assert.rejects(executor.write.execute([...common,{strategyId,simulationHash,policyCommitmentHash:stale[1],policyVersion:stale[2],deadline:BigInt(Math.floor(Date.now()/1_000)+60)}],{account:user.account}));
    const current=await policy.read.commitments([user.account.address]);
    await assert.rejects(executor.write.execute([...common,{strategyId,simulationHash,policyCommitmentHash:current[1],policyVersion:current[2],deadline:1n}],{account:user.account}));
    await assert.rejects(adapter.write.execute([user.account.address,"0x",strategyId],{account:user.account}));
  });

  it("keeps domain-separated V2 policy commitments unique across sequential versions", async function () {
    const [,user]=await viem.getWalletClients();
    const policy=await viem.deployContract("NaviPolicyManagerV2");
    const seen=new Set<string>();
    for(let version=1;version<=24;version++) {
      await policy.write.commit([keccak256(stringToHex(`policy-document-${version}`))],{account:user.account});
      const commitment=await policy.read.commitments([user.account.address]);
      assert.equal(commitment[2],BigInt(version));
      assert.equal(seen.has(commitment[1]),false);
      seen.add(commitment[1]);
    }
  });
});

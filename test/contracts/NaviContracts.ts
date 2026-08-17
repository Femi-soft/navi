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
});

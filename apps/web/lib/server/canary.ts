import { encodeAbiParameters, encodeFunctionData, getAddress, http, createPublicClient, keccak256, parseUnits, stringToHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

import type { CanaryConfig } from "./config";

const USDC = getAddress("0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f");
const A_USDC = getAddress("0x10F1A9D11CDf50041f3f8cB7191CBE2f31750ACC");
const MAX_ACTION = 10n * 1_000_000n;

const policyAbi = [
  { type:"function", name:"commit", stateMutability:"nonpayable", inputs:[{ name:"documentHash", type:"bytes32" }], outputs:[{ name:"commitmentHash", type:"bytes32" }, { name:"nextVersion", type:"uint256" }] },
  { type:"function", name:"commitments", stateMutability:"view", inputs:[{ name:"user", type:"address" }], outputs:[{ name:"documentHash", type:"bytes32" }, { name:"commitmentHash", type:"bytes32" }, { name:"version", type:"uint256" }] },
] as const;

const executorAbi = [
  { type:"function", name:"paused", stateMutability:"view", inputs:[], outputs:[{ type:"bool" }] },
  { type:"function", name:"evidenceSigner", stateMutability:"view", inputs:[], outputs:[{ type:"address" }] },
  { type:"function", name:"approvedAdapters", stateMutability:"view", inputs:[{ type:"address" }], outputs:[{ type:"bool" }] },
  { type:"function", name:"allowedUsers", stateMutability:"view", inputs:[{ type:"address" }], outputs:[{ type:"bool" }] },
  { type:"function", name:"execute", stateMutability:"nonpayable", inputs:[
    { name:"adapter", type:"address" }, { name:"adapterData", type:"bytes" },
    { name:"evidence", type:"tuple", components:[{ name:"strategyId", type:"bytes32" }, { name:"simulationHash", type:"bytes32" }, { name:"policyCommitmentHash", type:"bytes32" }, { name:"policyVersion", type:"uint256" }, { name:"deadline", type:"uint256" }] },
    { name:"authorization", type:"bytes" },
  ], outputs:[{ type:"bytes" }] },
] as const;

const erc20Abi = [
  { type:"function", name:"approve", stateMutability:"nonpayable", inputs:[{ name:"spender", type:"address" }, { name:"amount", type:"uint256" }], outputs:[{ type:"bool" }] },
  { type:"function", name:"allowance", stateMutability:"view", inputs:[{ name:"owner", type:"address" }, { name:"spender", type:"address" }], outputs:[{ type:"uint256" }] },
  { type:"function", name:"balanceOf", stateMutability:"view", inputs:[{ name:"account", type:"address" }], outputs:[{ type:"uint256" }] },
] as const;

export type CanaryAction = "SUPPLY" | "WITHDRAW";

function enabledConfig(config: CanaryConfig) {
  if (!config.enabled || !config.rpcUrl || !config.simulationSignerPrivateKey || !config.policyManagerAddress || !config.executorAddress || !config.adapterAddress) throw new Error("CANARY_DISABLED");
  return {
    ...config,
    rpcUrl:config.rpcUrl,
    simulationSignerPrivateKey:config.simulationSignerPrivateKey,
    policyManagerAddress:getAddress(config.policyManagerAddress),
    executorAddress:getAddress(config.executorAddress),
    adapterAddress:getAddress(config.adapterAddress),
  };
}

export function canaryPolicyDocument(config: CanaryConfig, user: `0x${string}`) {
  const current = enabledConfig(config);
  const document = {
    schema:"NAVI_BASE_SEPOLIA_CANARY_POLICY_V1",
    chainId:84532,
    user:getAddress(user),
    executor:current.executorAddress,
    adapter:current.adapterAddress,
    protocol:"AAVE_V3_BASE_SEPOLIA",
    asset:USDC,
    aToken:A_USDC,
    permittedActions:["SUPPLY", "WITHDRAW"],
    maxActionUsdc:"10.000000",
    maxUserDailyUsdc:"20.000000",
    maxGlobalDailyUsdc:"100.000000",
    nativeValueWei:"0",
  } as const;
  const canonical = JSON.stringify(document);
  return { document, canonical, documentHash:keccak256(stringToHex(canonical)) };
}

export function prepareCanaryPolicyTransaction(config: CanaryConfig, user: `0x${string}`) {
  const current = enabledConfig(config);
  const policy = canaryPolicyDocument(config, user);
  return {
    chainId:84532,
    from:getAddress(user),
    to:current.policyManagerAddress,
    data:encodeFunctionData({ abi:policyAbi, functionName:"commit", args:[policy.documentHash] }),
    valueWei:"0",
    policy,
    source:"NAVI_BASE_SEPOLIA_CANARY_POLICY_BUILDER",
    retrievedAt:new Date().toISOString(),
  };
}

export async function prepareCanaryExecution(config: CanaryConfig, input:{ user:`0x${string}`; action:CanaryAction; amount:string }) {
  const current = enabledConfig(config);
  const user = getAddress(input.user);
  if (!current.allowedWallets.includes(user.toLowerCase())) throw new Error("CANARY_USER_NOT_ALLOWED");
  if (!/^\d+(?:\.\d{1,6})?$/.test(input.amount)) throw new Error("CANARY_AMOUNT_INVALID");
  const amount = parseUnits(input.amount, 6);
  if (amount <= 0n || amount > MAX_ACTION) throw new Error("CANARY_AMOUNT_INVALID");
  const signer = privateKeyToAccount(current.simulationSignerPrivateKey);
  const client = createPublicClient({ chain:baseSepolia, transport:http(current.rpcUrl, { timeout:8_000, retryCount:1 }) });
  const token = input.action === "SUPPLY" ? USDC : A_USDC;
  const expectedPolicy = canaryPolicyDocument(config, user);
  const [chainId, block, paused, onchainSigner, adapterApproved, userAllowed, commitment, balance, allowance] = await Promise.all([
    client.getChainId(), client.getBlock(),
    client.readContract({ address:current.executorAddress, abi:executorAbi, functionName:"paused", authorizationList:undefined }),
    client.readContract({ address:current.executorAddress, abi:executorAbi, functionName:"evidenceSigner", authorizationList:undefined }),
    client.readContract({ address:current.executorAddress, abi:executorAbi, functionName:"approvedAdapters", args:[current.adapterAddress], authorizationList:undefined }),
    client.readContract({ address:current.executorAddress, abi:executorAbi, functionName:"allowedUsers", args:[user], authorizationList:undefined }),
    client.readContract({ address:current.policyManagerAddress, abi:policyAbi, functionName:"commitments", args:[user], authorizationList:undefined }),
    client.readContract({ address:token, abi:erc20Abi, functionName:"balanceOf", args:[user], authorizationList:undefined }),
    client.readContract({ address:token, abi:erc20Abi, functionName:"allowance", args:[user,current.adapterAddress], authorizationList:undefined }),
  ]);
  if (chainId !== 84532 || block.number === null || block.hash === null) throw new Error("CANARY_WRONG_NETWORK");
  const nowSeconds = BigInt(Math.floor(Date.now() / 1_000));
  if (block.timestamp > nowSeconds + 30n || nowSeconds - block.timestamp > 120n) throw new Error("CANARY_STALE_PROVIDER_BLOCK");
  if (paused || !adapterApproved || !userAllowed || getAddress(onchainSigner) !== signer.address) throw new Error("CANARY_ONCHAIN_GATE_CLOSED");
  if (commitment[0] !== expectedPolicy.documentHash || commitment[1] === `0x${"00".repeat(32)}` || commitment[2] < 1n) throw new Error("CANARY_POLICY_REQUIRED");
  if (balance < amount) throw new Error("CANARY_BALANCE_INSUFFICIENT");
  if (allowance < amount) {
    return {
      status:"PREREQUISITE" as const,
      prerequisite:"TOKEN_APPROVAL" as const,
      transaction:{ chainId:84532, from:user, to:token, data:encodeFunctionData({ abi:erc20Abi, functionName:"approve", args:[current.adapterAddress,amount] }), valueWei:"0" },
      source:"NAVI_FIXED_TOKEN_APPROVAL_BUILDER",
      retrievedAt:new Date().toISOString(),
    };
  }

  const adapterData = encodeAbiParameters([{ type:"uint8" }, { type:"uint256" }], [input.action === "SUPPLY" ? 0 : 1, amount]);
  const deadline = nowSeconds + 120n;
  const strategyId = keccak256(stringToHex(["NAVI_BASE_SEPOLIA_CANARY", user, input.action, amount.toString(), commitment[1], commitment[2].toString()].join("|")));
  const simulationHash = keccak256(stringToHex(["NAVI_PROVIDER_SIMULATION_V3", chainId, user, current.executorAddress, current.adapterAddress, keccak256(adapterData), strategyId, commitment[1], commitment[2].toString(), block.number.toString(), block.hash, deadline.toString()].join("|")));
  const evidence = { strategyId, simulationHash, policyCommitmentHash:commitment[1], policyVersion:commitment[2], deadline };
  const authorization = await signer.signTypedData({
    domain:{ name:"NAVI Executor", version:"3", chainId:84532, verifyingContract:current.executorAddress },
    primaryType:"ExecutionAuthorization",
    types:{ ExecutionAuthorization:[
      { name:"user", type:"address" }, { name:"adapter", type:"address" }, { name:"adapterDataHash", type:"bytes32" },
      { name:"strategyId", type:"bytes32" }, { name:"simulationHash", type:"bytes32" },
      { name:"policyCommitmentHash", type:"bytes32" }, { name:"policyVersion", type:"uint256" }, { name:"deadline", type:"uint256" },
    ] },
    message:{ user, adapter:current.adapterAddress, adapterDataHash:keccak256(adapterData), ...evidence },
  });
  const data = encodeFunctionData({ abi:executorAbi, functionName:"execute", args:[current.adapterAddress,adapterData,evidence,authorization] });
  const call = { account:user, to:current.executorAddress, data, value:0n, blockNumber:block.number } as const;
  let gasEstimate: bigint;
  try {
    await client.call(call);
    gasEstimate = await client.estimateGas(call);
  } catch { throw new Error("CANARY_PROVIDER_SIMULATION_FAILED"); }
  const retrievedAt = new Date().toISOString();
  return {
    status:"SIMULATED" as const,
    transaction:{ chainId:84532, from:user, to:current.executorAddress, data, valueWei:"0", gasEstimate:gasEstimate.toString() },
    evidence:{ simulationHash, strategyId, policyCommitmentHash:commitment[1], policyVersion:commitment[2].toString(), blockNumber:block.number.toString(), blockHash:block.hash, expiresAt:new Date(Number(deadline) * 1_000).toISOString(), authorization },
    source:"BASE_SEPOLIA_RPC_PROVIDER_SIMULATION+NAVI_EIP712_AUTHORIZATION",
    retrievedAt,
  };
}

export const canaryPublicMetadata = {
  chainId:84532,
  networkLabel:"Base Sepolia",
  protocol:"Aave V3",
  asset:"USDC",
  maxActionUsdc:"10.000000",
  maxUserDailyUsdc:"20.000000",
  maxGlobalDailyUsdc:"100.000000",
  executionMode:"USER_AUTHORIZED_CANARY",
} as const;

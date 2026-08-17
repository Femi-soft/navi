import Decimal from "decimal.js";
import { SignJWT, jwtVerify } from "jose";
import { getAddress, isHex, keccak256, stringToHex, type Hex } from "viem";

import { createId, type NaviStrategy, type Portfolio, type SourceMetadata } from "@navi/core";
import type { PolicyRuleResult } from "@navi/policy";

export interface SimulationTransaction {
  chainId: number;
  from: `0x${string}`;
  to: `0x${string}`;
  data: Hex;
  valueWei: string;
}

interface SimulationBase extends SourceMetadata {
  id: string;
  strategyId: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  estimatedGasUsd: string;
  expectedSlippageUsd: string;
  before: Portfolio;
  after: { liquidUsd: string; riskScore: number };
  policyValidation: PolicyRuleResult[];
  warnings: string[];
  createdAt: string;
  expiresAt: string;
}

export interface DemoSimulation extends SimulationBase {
  mode: "DEMO";
  transaction: null;
  policyHash: null;
  policyVersion: null;
  evidence: null;
  attestation: null;
}

export interface ProviderSimulationEvidence {
  blockNumber: string;
  blockHash: Hex;
  blockTimestamp: string;
  gasEstimate: string;
  gasPriceWei: string;
  returnData: Hex;
  traceAvailable: boolean;
  economicOutcomeVerified: boolean;
  transactionBinding: Hex;
}

export interface ProviderSimulation extends SimulationBase {
  mode: "PROVIDER";
  transaction: SimulationTransaction;
  policyHash: Hex;
  policyVersion: number;
  evidence: ProviderSimulationEvidence;
  attestation: { issuer: string; token: string } | null;
}

export type Simulation = DemoSimulation | ProviderSimulation;

export interface SimulationProvider {
  simulate(strategy: NaviStrategy, before: Portfolio, checks: PolicyRuleResult[]): Promise<Simulation>;
}

export const demoSimulator: SimulationProvider = {
  async simulate(strategy, before, checks) {
    const createdAt = new Date();
    return {
      id:createId("simulation"), strategyId:strategy.id, status:checks.some(c=>c.result==="BLOCK")?"FAILED":"SUCCESS", mode:"DEMO",
      estimatedGasUsd:"0.08", expectedSlippageUsd:"0.20", before,
      after:{liquidUsd:strategy.liquidityAfter,riskScore:strategy.riskAfter}, policyValidation:checks,
      warnings:["Sample result only. No RPC eth_call was performed."], createdAt:createdAt.toISOString(),
      expiresAt:new Date(createdAt.getTime()+120_000).toISOString(), source:"NAVI_DEMO_SIMULATOR", retrievedAt:createdAt.toISOString(),
      transaction:null, policyHash:null, policyVersion:null, evidence:null, attestation:null,
    };
  }
};

export interface RpcSimulationClient {
  getChainId(): Promise<number>;
  getBlock(): Promise<{ number: bigint | null; hash: Hex | null; timestamp: bigint }>;
  call(input:{ account:`0x${string}`; to:`0x${string}`; data:Hex; value:bigint; blockNumber:bigint }): Promise<{ data?: Hex }>;
  estimateGas(input:{ account:`0x${string}`; to:`0x${string}`; data:Hex; value:bigint; blockNumber:bigint }): Promise<bigint>;
  getGasPrice(): Promise<bigint>;
  traceCall?(input:{ from:`0x${string}`; to:`0x${string}`; data:Hex; value:Hex; blockNumber:Hex }): Promise<unknown>;
}

export interface ProviderSimulationRequest {
  strategyId: string;
  before: Portfolio;
  policyHash: Hex;
  policyVersion: number;
  policyValidation: PolicyRuleResult[];
  transaction: SimulationTransaction;
  nativePrice: { usd:string; source:string; retrievedAt:string };
}

export interface SimulationOutcomeVerifier {
  verify(input:{ request:ProviderSimulationRequest; returnData:Hex; trace:unknown | null }): Promise<{
    after:{ liquidUsd:string; riskScore:number };
    expectedSlippageUsd:string;
    warnings:string[];
  }>;
}

export class ProviderSimulationAttestor {
  private readonly key: Uint8Array;
  readonly issuer: string;

  constructor(secret:string, issuer="NAVI_SIMULATION_SERVICE") {
    if (secret.length < 32) throw new Error("SIMULATION_ATTESTATION_SECRET_TOO_SHORT");
    this.key = new TextEncoder().encode(secret);
    this.issuer = issuer;
  }

  async attest(simulation:ProviderSimulation):Promise<ProviderSimulation> {
    const digest=simulationDigest(simulation);
    const token=await new SignJWT({ digest, simulationId:simulation.id, transactionBinding:simulation.evidence.transactionBinding })
      .setProtectedHeader({ alg:"HS256", typ:"JWT" })
      .setIssuer(this.issuer)
      .setIssuedAt(Math.floor(new Date(simulation.createdAt).getTime()/1_000))
      .setExpirationTime(Math.floor(new Date(simulation.expiresAt).getTime()/1_000))
      .sign(this.key);
    return { ...simulation, attestation:{ issuer:this.issuer, token } };
  }

  async verify(simulation:Simulation):Promise<boolean> {
    if (!simulationIsFresh(simulation) || !simulation.attestation || simulation.attestation.issuer !== this.issuer) return false;
    try {
      const verified=await jwtVerify(simulation.attestation.token, this.key, { issuer:this.issuer, algorithms:["HS256"] });
      return verified.payload.digest === simulationDigest(simulation)
        && verified.payload.simulationId === simulation.id
        && verified.payload.transactionBinding === simulation.evidence.transactionBinding;
    } catch {
      return false;
    }
  }
}

export class XLayerRpcSimulationProvider {
  private readonly client:RpcSimulationClient;
  private readonly attestor:ProviderSimulationAttestor;
  private readonly outcomeVerifier:SimulationOutcomeVerifier;
  private readonly expectedChainId:1952|196;
  private readonly source:string;
  private readonly ttlMs:number;
  private readonly maxBlockAgeMs:number;

  constructor(
    client:RpcSimulationClient,
    attestor:ProviderSimulationAttestor,
    outcomeVerifier:SimulationOutcomeVerifier,
    expectedChainId:1952|196,
    source:string,
    ttlMs=120_000,
    maxBlockAgeMs=120_000,
  ) {
    this.client=client;
    this.attestor=attestor;
    this.outcomeVerifier=outcomeVerifier;
    this.expectedChainId=expectedChainId;
    this.source=source;
    this.ttlMs=ttlMs;
    this.maxBlockAgeMs=maxBlockAgeMs;
  }

  async simulate(request:ProviderSimulationRequest, now=Date.now()):Promise<ProviderSimulation> {
    validateProviderRequest(request,now);
    const [chainId,block]=await Promise.all([this.client.getChainId(),this.client.getBlock()]);
    if (chainId !== this.expectedChainId || request.transaction.chainId !== this.expectedChainId || request.before.chainId !== this.expectedChainId) throw new Error("WRONG_NETWORK");
    if (block.number === null || block.hash === null) throw new Error("SIMULATION_BLOCK_UNAVAILABLE");
    const blockTimestamp=new Date(Number(block.timestamp)*1_000);
    if (!Number.isFinite(blockTimestamp.getTime()) || now-blockTimestamp.getTime()>this.maxBlockAgeMs || blockTimestamp.getTime()>now+30_000) throw new Error("SIMULATION_BLOCK_STALE");
    const callInput={ account:getAddress(request.transaction.from), to:getAddress(request.transaction.to), data:request.transaction.data, value:BigInt(request.transaction.valueWei), blockNumber:block.number };
    const [callResult,gasEstimate,gasPrice]=await Promise.all([this.client.call(callInput),this.client.estimateGas(callInput),this.client.getGasPrice()]);
    const returnData=callResult.data ?? "0x";
    let trace:unknown|null=null;
    const warnings:string[]=[];
    if (this.client.traceCall) {
      try {
        trace=await this.client.traceCall({ from:callInput.account, to:callInput.to, data:callInput.data, value:`0x${callInput.value.toString(16)}`, blockNumber:`0x${block.number.toString(16)}` });
      } catch {
        warnings.push("Provider trace was unavailable; eth_call and gas estimation succeeded.");
      }
    } else {
      warnings.push("Provider trace is not configured; eth_call and gas estimation succeeded.");
    }
    const outcome=await this.outcomeVerifier.verify({ request, returnData, trace });
    const createdAt=new Date(now).toISOString();
    const expiresAt=new Date(now+this.ttlMs).toISOString();
    const retrievedAt=createdAt;
    const transactionBinding=simulationTransactionBinding(request, block.number, block.hash);
    const estimatedGasUsd=new Decimal(gasEstimate.toString()).mul(gasPrice.toString()).div("1000000000000000000").mul(request.nativePrice.usd).toFixed(8);
    const unsigned:ProviderSimulation={
      id:createId("simulation"), strategyId:request.strategyId,
      status:request.policyValidation.some(check=>check.result==="BLOCK")?"FAILED":"SUCCESS", mode:"PROVIDER",
      estimatedGasUsd, expectedSlippageUsd:outcome.expectedSlippageUsd, before:request.before, after:outcome.after,
      policyValidation:request.policyValidation, warnings:[...warnings,...outcome.warnings], createdAt, expiresAt,
      source:`${this.source}+${request.nativePrice.source}`, retrievedAt,
      transaction:{ ...request.transaction, from:callInput.account, to:callInput.to }, policyHash:request.policyHash, policyVersion:request.policyVersion,
      evidence:{ blockNumber:block.number.toString(), blockHash:block.hash, blockTimestamp:blockTimestamp.toISOString(), gasEstimate:gasEstimate.toString(), gasPriceWei:gasPrice.toString(), returnData, traceAvailable:trace !== null, economicOutcomeVerified:true, transactionBinding },
      attestation:null,
    };
    return this.attestor.attest(unsigned);
  }
}

export function simulationIsFresh(simulation:Simulation, now=Date.now()):simulation is ProviderSimulation {
  if (simulation.mode !== "PROVIDER" || simulation.status !== "SUCCESS" || !simulation.attestation) return false;
  const createdAt=new Date(simulation.createdAt).getTime();
  const retrievedAt=new Date(simulation.retrievedAt).getTime();
  const expiresAt=new Date(simulation.expiresAt).getTime();
  if (![createdAt,retrievedAt,expiresAt].every(Number.isFinite) || createdAt>now+30_000 || retrievedAt>now+30_000 || now-retrievedAt>120_000 || expiresAt<=now) return false;
  if (simulation.policyValidation.some(check=>check.result==="BLOCK") || !simulation.evidence.economicOutcomeVerified) return false;
  if (simulation.before.chainId !== simulation.transaction.chainId || simulation.policyVersion < 1) return false;
  return simulation.evidence.transactionBinding === simulationTransactionBinding(simulation, BigInt(simulation.evidence.blockNumber), simulation.evidence.blockHash);
}

export function simulationTransactionBinding(request:Pick<ProviderSimulationRequest,"strategyId"|"policyHash"|"policyVersion"|"transaction">, blockNumber:bigint, blockHash:Hex):Hex {
  const tx=request.transaction;
  const canonical=[String(tx.chainId),getAddress(tx.from),getAddress(tx.to),tx.data,BigInt(tx.valueWei).toString(),request.strategyId,request.policyHash,String(request.policyVersion),blockNumber.toString(),blockHash].join("|");
  return keccak256(stringToHex(canonical));
}

export function simulationDigest(simulation:ProviderSimulation):Hex {
  const { attestation:_, ...unsigned }=simulation;
  return keccak256(stringToHex(stableStringify(unsigned)));
}

function validateProviderRequest(request:ProviderSimulationRequest,now:number) {
  if (!request.strategyId || request.policyVersion < 1 || !Number.isInteger(request.policyVersion)) throw new Error("SIMULATION_REQUEST_INVALID");
  if (!isHex(request.policyHash, { strict:true }) || request.policyHash.length !== 66 || !isHex(request.transaction.data, { strict:true })) throw new Error("SIMULATION_REQUEST_INVALID");
  getAddress(request.transaction.from);
  getAddress(request.transaction.to);
  if (BigInt(request.transaction.valueWei) < 0n || new Decimal(request.nativePrice.usd).lte(0)) throw new Error("SIMULATION_REQUEST_INVALID");
  const priceTime=new Date(request.nativePrice.retrievedAt).getTime();
  if (!request.nativePrice.source || !Number.isFinite(priceTime) || now-priceTime>180_000 || priceTime>now+30_000) throw new Error("SIMULATION_PRICE_INVALID");
}

function stableStringify(value:unknown):string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries=Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b));
    return `{${entries.map(([key,item])=>`${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

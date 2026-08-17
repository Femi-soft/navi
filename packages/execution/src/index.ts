import type { Simulation } from "@navi/simulation";
import { simulationIsFresh } from "@navi/simulation";
import type { TransactionReceipt } from "viem";

export interface PreparedTransaction { chainId:number; from:`0x${string}`; to:`0x${string}`; data:`0x${string}`; value:bigint; gasEstimate:bigint; description:string; simulationId:string; expiresAt:string }
export interface ProtocolAdapter { readonly id:string; readonly chainId:number; readonly allowedTargets:readonly `0x${string}`[]; prepare(input:{from:`0x${string}`;target:`0x${string}`;simulation:Simulation}):Promise<PreparedTransaction> }

export interface VerifiedReceipt { txHash:`0x${string}`; chainId:number; blockNumber:string; status:"CONFIRMED"; source:string; retrievedAt:string }
export interface ReceiptReader {
  getChainId():Promise<number>;
  waitForTransactionReceipt(input:{hash:`0x${string}`;confirmations:number}):Promise<TransactionReceipt>;
  getTransactionReceipt(input:{hash:`0x${string}`}):Promise<TransactionReceipt>;
}

export const X_LAYER_CHAIN_IDS = [1952, 196] as const;
export type XLayerChainId = (typeof X_LAYER_CHAIN_IDS)[number];

function assertXLayerChainId(chainId: number): asserts chainId is XLayerChainId {
  if (!X_LAYER_CHAIN_IDS.includes(chainId as XLayerChainId)) throw new Error("UNSUPPORTED_X_LAYER_NETWORK");
}

export class XLayerReceiptVerifier {
  private readonly client: ReceiptReader;
  private readonly expectedChainId: XLayerChainId;
  private readonly confirmations: number;
  constructor(client: ReceiptReader, expectedChainId: XLayerChainId, confirmations = 2) {
    assertXLayerChainId(expectedChainId);
    this.client = client;
    this.expectedChainId = expectedChainId;
    this.confirmations = confirmations;
  }
  async verify(txHash: `0x${string}`): Promise<VerifiedReceipt> {
    const chainId = await this.client.getChainId();
    if (chainId !== this.expectedChainId) throw new Error("WRONG_NETWORK");
    const receipt: TransactionReceipt = await this.client.waitForTransactionReceipt({ hash:txHash, confirmations:this.confirmations });
    if (receipt.status !== "success") throw new Error("TRANSACTION_REVERTED");
    const canonical = await this.client.getTransactionReceipt({ hash:txHash });
    if (canonical.blockHash !== receipt.blockHash || canonical.status !== "success") throw new Error("RECEIPT_NOT_CANONICAL");
    return { txHash, chainId, blockNumber:receipt.blockNumber.toString(), status:"CONFIRMED", source:"X_LAYER_RPC_RECEIPT", retrievedAt:new Date().toISOString() };
  }
}

export class ExecutionBuilder {
  private readonly adapters = new Map<string, ProtocolAdapter>();
  private readonly expectedChainId: XLayerChainId;
  private readonly evidenceVerifier: { verify(simulation:Simulation):Promise<boolean> };
  constructor(expectedChainId: XLayerChainId, evidenceVerifier:{ verify(simulation:Simulation):Promise<boolean> }) {
    assertXLayerChainId(expectedChainId);
    this.expectedChainId = expectedChainId;
    this.evidenceVerifier = evidenceVerifier;
  }
  register(adapter:ProtocolAdapter) {
    if (this.adapters.has(adapter.id)) throw new Error("DUPLICATE_ADAPTER");
    if (adapter.chainId !== this.expectedChainId) throw new Error("ADAPTER_WRONG_NETWORK");
    this.adapters.set(adapter.id, adapter);
  }
  async prepare(adapterId:string, input:{from:`0x${string}`;target:`0x${string}`;simulation:Simulation}) {
    if (!simulationIsFresh(input.simulation) || !await this.evidenceVerifier.verify(input.simulation)) throw new Error("SIMULATION_INVALID_OR_NOT_PROVIDER_VERIFIED");
    const adapter = this.adapters.get(adapterId);
    if (!adapter) throw new Error("UNSUPPORTED_PROTOCOL_ADAPTER");
    if (adapter.chainId !== input.simulation.before.chainId || adapter.chainId !== this.expectedChainId) throw new Error("ADAPTER_WRONG_NETWORK");
    if (!adapter.allowedTargets.includes(input.target)) throw new Error("TARGET_NOT_ALLOWLISTED");
    if (input.from.toLowerCase() !== input.simulation.transaction.from.toLowerCase() || input.target.toLowerCase() !== input.simulation.transaction.to.toLowerCase()) throw new Error("SIMULATION_TRANSACTION_MISMATCH");
    const prepared = await adapter.prepare(input);
    if (prepared.chainId !== this.expectedChainId) throw new Error("PREPARED_TRANSACTION_WRONG_NETWORK");
    if (prepared.from.toLowerCase() !== input.from.toLowerCase()) throw new Error("PREPARED_TRANSACTION_WRONG_SENDER");
    if (prepared.to.toLowerCase() !== input.target.toLowerCase() || !adapter.allowedTargets.some(target => target.toLowerCase() === prepared.to.toLowerCase())) throw new Error("PREPARED_TRANSACTION_TARGET_NOT_ALLOWLISTED");
    if (prepared.simulationId !== input.simulation.id) throw new Error("PREPARED_TRANSACTION_SIMULATION_MISMATCH");
    if (prepared.expiresAt !== input.simulation.expiresAt || new Date(prepared.expiresAt).getTime() <= Date.now()) throw new Error("PREPARED_TRANSACTION_EXPIRED");
    if (prepared.value < 0n || prepared.gasEstimate <= 0n) throw new Error("PREPARED_TRANSACTION_INVALID_LIMITS");
    if (prepared.data !== input.simulation.transaction.data || prepared.value.toString() !== input.simulation.transaction.valueWei || prepared.gasEstimate.toString() !== input.simulation.evidence.gasEstimate) throw new Error("PREPARED_TRANSACTION_NOT_SIMULATED");
    return prepared;
  }
}

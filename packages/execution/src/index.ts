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

export class XLayerReceiptVerifier {
  private readonly client: ReceiptReader;
  private readonly confirmations: number;
  constructor(client: ReceiptReader, confirmations = 2) { this.client = client; this.confirmations = confirmations; }
  async verify(txHash: `0x${string}`): Promise<VerifiedReceipt> {
    const chainId = await this.client.getChainId();
    if (chainId !== 196) throw new Error("WRONG_NETWORK");
    const receipt: TransactionReceipt = await this.client.waitForTransactionReceipt({ hash:txHash, confirmations:this.confirmations });
    if (receipt.status !== "success") throw new Error("TRANSACTION_REVERTED");
    const canonical = await this.client.getTransactionReceipt({ hash:txHash });
    if (canonical.blockHash !== receipt.blockHash || canonical.status !== "success") throw new Error("RECEIPT_NOT_CANONICAL");
    return { txHash, chainId, blockNumber:receipt.blockNumber.toString(), status:"CONFIRMED", source:"X_LAYER_RPC_RECEIPT", retrievedAt:new Date().toISOString() };
  }
}

export class ExecutionBuilder {
  private readonly adapters = new Map<string, ProtocolAdapter>();
  register(adapter:ProtocolAdapter) { if (this.adapters.has(adapter.id)) throw new Error("DUPLICATE_ADAPTER"); this.adapters.set(adapter.id, adapter); }
  async prepare(adapterId:string, input:{from:`0x${string}`;target:`0x${string}`;simulation:Simulation}) {
    if (!simulationIsFresh(input.simulation)) throw new Error("SIMULATION_INVALID_OR_NOT_PROVIDER_VERIFIED");
    const adapter = this.adapters.get(adapterId);
    if (!adapter) throw new Error("UNSUPPORTED_PROTOCOL_ADAPTER");
    if (adapter.chainId !== input.simulation.before.chainId || adapter.chainId !== 196) throw new Error("ADAPTER_WRONG_NETWORK");
    if (!adapter.allowedTargets.includes(input.target)) throw new Error("TARGET_NOT_ALLOWLISTED");
    return adapter.prepare(input);
  }
}

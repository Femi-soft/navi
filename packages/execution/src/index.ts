import type { Simulation } from "@navi/simulation";
import { simulationIsFresh } from "@navi/simulation";

export interface PreparedTransaction { chainId:number; from:`0x${string}`; to:`0x${string}`; data:`0x${string}`; value:bigint; gasEstimate:bigint; description:string; simulationId:string; expiresAt:string }
export interface ProtocolAdapter { readonly id:string; readonly chainId:number; readonly allowedTargets:readonly `0x${string}`[]; prepare(input:{from:`0x${string}`;target:`0x${string}`;simulation:Simulation}):Promise<PreparedTransaction> }

export class ExecutionBuilder {
  private readonly adapters = new Map<string, ProtocolAdapter>();
  register(adapter:ProtocolAdapter) { if (this.adapters.has(adapter.id)) throw new Error("DUPLICATE_ADAPTER"); this.adapters.set(adapter.id, adapter); }
  async prepare(adapterId:string, input:{from:`0x${string}`;target:`0x${string}`;simulation:Simulation}) {
    if (!simulationIsFresh(input.simulation)) throw new Error("SIMULATION_INVALID_OR_NOT_PROVIDER_VERIFIED");
    const adapter = this.adapters.get(adapterId);
    if (!adapter) throw new Error("UNSUPPORTED_PROTOCOL_ADAPTER");
    if (!adapter.allowedTargets.includes(input.target)) throw new Error("TARGET_NOT_ALLOWLISTED");
    return adapter.prepare(input);
  }
}

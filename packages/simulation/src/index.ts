import { createId, type NaviStrategy, type Portfolio } from "@navi/core";
import type { PolicyRuleResult } from "@navi/policy";

export interface Simulation { id:string; strategyId:string; status:"PENDING"|"SUCCESS"|"FAILED"; mode:"DEMO"|"PROVIDER"; estimatedGasUsd:string; expectedSlippageUsd:string; before:Portfolio; after:{ liquidUsd:string; riskScore:number }; policyValidation:PolicyRuleResult[]; warnings:string[]; createdAt:string; expiresAt:string }
export interface SimulationProvider { simulate(strategy:NaviStrategy, before:Portfolio, checks:PolicyRuleResult[]):Promise<Simulation> }

export const demoSimulator: SimulationProvider = {
  async simulate(strategy, before, checks) {
    const createdAt = new Date();
    return { id:createId("simulation"), strategyId:strategy.id, status:checks.some(c=>c.result==="BLOCK")?"FAILED":"SUCCESS", mode:"DEMO", estimatedGasUsd:"0.08", expectedSlippageUsd:"0.20", before, after:{liquidUsd:strategy.liquidityAfter,riskScore:strategy.riskAfter}, policyValidation:checks, warnings:["Sample result only. No RPC eth_call was performed."], createdAt:createdAt.toISOString(), expiresAt:new Date(createdAt.getTime()+120_000).toISOString() };
  }
};
export const simulationIsFresh = (simulation:Simulation, now=Date.now()) => simulation.status === "SUCCESS" && simulation.mode === "PROVIDER" && new Date(simulation.expiresAt).getTime() > now;

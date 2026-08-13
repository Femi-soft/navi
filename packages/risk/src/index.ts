import type { Opportunity } from "@navi/core";

export const RISK_MODEL_VERSION = "risk_model_v1";
export interface RiskFactor { category: string; score: number; weight: number; contribution: number }
export interface RiskAssessment { score: number; level: "LOW"|"MODERATE"|"ELEVATED"|"HIGH"|"CRITICAL"; factors: RiskFactor[]; timestamp: string; modelVersion: string }

export function assessOpportunity(opportunity: Opportunity): RiskAssessment {
  const factors = [
    { category:"protocol", score:opportunity.riskScore, weight:.5 },
    { category:"liquidity", score:100-opportunity.liquidityScore, weight:.3 },
    { category:opportunity.marketType === "RWA" ? "counterparty" : "smart-contract", score:opportunity.marketType === "RWA" ? 30 : 24, weight:.2 }
  ].map(f => ({ ...f, contribution:Number((f.score*f.weight).toFixed(2)) }));
  const score = Math.round(factors.reduce((sum, f) => sum + f.contribution, 0));
  const level = score < 20 ? "LOW" : score < 40 ? "MODERATE" : score < 60 ? "ELEVATED" : score < 80 ? "HIGH" : "CRITICAL";
  return { score, level, factors, timestamp:new Date().toISOString(), modelVersion:RISK_MODEL_VERSION };
}

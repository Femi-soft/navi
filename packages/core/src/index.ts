import Decimal from "decimal.js";

export type Money = string;
export type MarketType = "DEFI" | "RWA";
export type SourceMetadata = { source: string; retrievedAt: string };

export interface Opportunity extends SourceMetadata {
  id: string; label: string; marketType: MarketType; protocolId: string; asset: string;
  apy: string; riskScore: number; liquidityScore: number; tvlUsd?: Money;
  lockPeriodSeconds?: number; redemptionDays?: number; minimumDepositUsd?: Money;
  executable: boolean; adapterId?: string;
}

export interface Portfolio extends SourceMetadata {
  wallet: string; chainId: number; totalUsd: Money; liquidUsd: Money; deployedUsd: Money;
  currentApy: string; riskScore: number; updatedAt: string;
  allocation: { stablecoins: Money; defi: Money; rwa: Money; volatile: Money };
}

export interface FinancialIntent {
  objective: "yield" | "preserve" | "diversify";
  capitalUsd: Money; minimumLiquidUsd: Money;
  riskPreference: "conservative" | "balanced" | "aggressive";
  leverageAllowed: boolean;
}

export interface Policy {
  id: string; version: number; maxRiskScore: number; minimumLiquidityUsd: Money;
  maxProtocolExposurePercent: number; maxSlippageBps: number; maximumTransactionUsd: Money;
  allowedAssets: string[]; blockedAssets: string[]; allowedProtocols: string[]; blockedProtocols: string[];
  allowRwa: boolean; allowLeverage: boolean;
}

export interface Allocation { opportunityId: string; protocolId: string; label: string; amountUsd: Money; apy: string; riskScore: number }
export interface NaviStrategy {
  id: string; allocations: Allocation[]; expectedApy: string; projectedReturnUsd: Money;
  riskBefore: number; riskAfter: number; liquidityBefore: Money; liquidityAfter: Money;
  status: "DRAFT" | "SIMULATED" | "APPROVED" | "EXECUTED";
}

export const money = (value: Decimal.Value) => new Decimal(value);
export const moneyString = (value: Decimal.Value, places = 2) => money(value).toFixed(places);
export const isFresh = (retrievedAt: string, maxAgeMs: number, now = Date.now()) => now - new Date(retrievedAt).getTime() <= maxAgeMs;
export const createId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

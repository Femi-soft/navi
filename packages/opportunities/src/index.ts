import type { MarketType, Opportunity } from "@navi/core";

export interface OpportunityFilters { asset?: string; category?: MarketType; maxRiskScore?: number; minimumApy?: string }
export interface OpportunityProvider { discover(filters?: OpportunityFilters): Promise<Opportunity[]> }

const samples = [
  { id:"defi-lend-usdc", label:"USDC lending pool", marketType:"DEFI", protocolId:"sample-lend", asset:"USDC", apy:"5.60", riskScore:18, liquidityScore:91, tvlUsd:"12000000", executable:false },
  { id:"rwa-tbill-usdc", label:"Tokenized T-bill vault", marketType:"RWA", protocolId:"sample-rwa", asset:"USDC", apy:"5.10", riskScore:21, liquidityScore:72, tvlUsd:"8400000", redemptionDays:2, executable:false },
  { id:"defi-vault-usdt", label:"Stablecoin yield vault", marketType:"DEFI", protocolId:"sample-vault", asset:"USDT", apy:"6.20", riskScore:28, liquidityScore:80, tvlUsd:"6100000", executable:false }
] satisfies Omit<Opportunity, "source" | "retrievedAt">[];

export const demoOpportunities: OpportunityProvider = {
  async discover(filters = {}) {
    const retrievedAt = new Date().toISOString();
    return samples.map(item => ({ ...item, source:"NAVI_SAMPLE_OPPORTUNITIES", retrievedAt })).filter(item =>
      (!filters.asset || item.asset === filters.asset) && (!filters.category || item.marketType === filters.category) &&
      (filters.maxRiskScore === undefined || item.riskScore <= filters.maxRiskScore) &&
      (filters.minimumApy === undefined || Number(item.apy) >= Number(filters.minimumApy))
    );
  }
};

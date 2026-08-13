import { isFresh, money, type Opportunity, type Policy } from "@navi/core";

export const demoPolicy: Policy = {
  id:"policy_demo", version:1, maxRiskScore:30, minimumLiquidityUsd:"1000.00", maxProtocolExposurePercent:30,
  maxSlippageBps:50, maximumTransactionUsd:"2000.00", allowedAssets:["USDC","USDT"], blockedAssets:[],
  allowedProtocols:["sample-lend","sample-rwa","sample-vault"], blockedProtocols:[], allowRwa:true, allowLeverage:false
};
export type RuleStatus = "PASS"|"WARNING"|"BLOCK";
export interface PolicyRuleResult { rule:string; result:RuleStatus; expected:string; actual:string; reason?:string }

export function evaluateOpportunity(opportunity: Opportunity, amountUsd: string, policy: Policy, totalPortfolioUsd: string): PolicyRuleResult[] {
  const exposure = money(amountUsd).div(totalPortfolioUsd).mul(100);
  return [
    { rule:"maximum-risk", result:opportunity.riskScore <= policy.maxRiskScore ? "PASS":"BLOCK", expected:`<= ${policy.maxRiskScore}`, actual:String(opportunity.riskScore) },
    { rule:"asset-allowlist", result:policy.allowedAssets.includes(opportunity.asset) && !policy.blockedAssets.includes(opportunity.asset) ? "PASS":"BLOCK", expected:"allowed asset", actual:opportunity.asset },
    { rule:"protocol-allowlist", result:policy.allowedProtocols.includes(opportunity.protocolId) && !policy.blockedProtocols.includes(opportunity.protocolId) ? "PASS":"BLOCK", expected:"allowed protocol", actual:opportunity.protocolId },
    { rule:"rwa-permission", result:opportunity.marketType !== "RWA" || policy.allowRwa ? "PASS":"BLOCK", expected:`allowRwa=${policy.allowRwa}`, actual:opportunity.marketType },
    { rule:"protocol-exposure", result:exposure.lte(policy.maxProtocolExposurePercent) ? "PASS":"BLOCK", expected:`<= ${policy.maxProtocolExposurePercent}%`, actual:`${exposure.toFixed(2)}%` },
    { rule:"transaction-size", result:money(amountUsd).lte(policy.maximumTransactionUsd) ? "PASS":"BLOCK", expected:`<= $${policy.maximumTransactionUsd}`, actual:`$${amountUsd}` },
    { rule:"data-freshness", result:isFresh(opportunity.retrievedAt, 5*60_000) ? "PASS":"BLOCK", expected:"<= 5 minutes old", actual:opportunity.retrievedAt }
  ];
}
export const isPolicyAllowed = (results: PolicyRuleResult[]) => results.every(r => r.result !== "BLOCK");

import { createId, money, moneyString, type FinancialIntent, type NaviStrategy, type Opportunity, type Policy, type Portfolio } from "@navi/core";
import { evaluateOpportunity, isPolicyAllowed } from "@navi/policy";

export interface GenerateStrategyInput { intent:FinancialIntent; portfolio:Portfolio; opportunities:Opportunity[]; policy:Policy }
export interface GeneratedStrategy extends NaviStrategy { eligibleOpportunities:Opportunity[]; tradeoffs:{ yieldDelta:string; riskDelta:number; liquidityImpact:"higher"|"same"|"lower"; estimatedAnnualGainUsd:string } }

export function generateStrategy({ intent, portfolio, opportunities, policy }: GenerateStrategyInput): GeneratedStrategy {
  if (intent.leverageAllowed && !policy.allowLeverage) throw new Error("POLICY_BLOCKED: leverage is disabled");
  const requiredLiquid = DecimalMax(intent.minimumLiquidUsd, policy.minimumLiquidityUsd);
  const walletCapacity = money(portfolio.liquidUsd).minus(requiredLiquid);
  const investable = DecimalMin(money(intent.capitalUsd).minus(requiredLiquid), walletCapacity);
  if (investable.lte(0)) throw new Error("INSUFFICIENT_INVESTABLE_CAPITAL");
  const cap = money(portfolio.totalUsd).mul(policy.maxProtocolExposurePercent).div(100);
  const candidateAmount = DecimalMin(cap, investable, policy.maximumTransactionUsd);
  const eligibleOpportunities = opportunities
    .filter(o => isPolicyAllowed(evaluateOpportunity(o, moneyString(candidateAmount), policy, portfolio.totalUsd)))
    .sort((a,b) => rank(b, intent.riskPreference)-rank(a, intent.riskPreference));
  if (!eligibleOpportunities.length) throw new Error("NO_ELIGIBLE_OPPORTUNITIES");
  let remaining = investable;
  const allocations = eligibleOpportunities.flatMap(o => {
    if (remaining.lte(0)) return [];
    const amount = DecimalMin(remaining, cap, policy.maximumTransactionUsd);
    remaining = remaining.minus(amount);
    return [{ opportunityId:o.id, protocolId:o.protocolId, label:o.label, amountUsd:moneyString(amount), apy:o.apy, riskScore:o.riskScore }];
  });
  const allocated = allocations.reduce((sum,a) => sum.plus(a.amountUsd), money(0));
  const weightedApy = allocations.reduce((sum,a) => sum.plus(money(a.amountUsd).mul(a.apy)), money(0)).div(allocated);
  const weightedRisk = allocations.reduce((sum,a) => sum.plus(money(a.amountUsd).mul(a.riskScore)), money(0)).div(allocated).round().toNumber();
  const annual = allocated.mul(weightedApy).div(100);
  const liquidityAfter = money(portfolio.liquidUsd).minus(allocated);
  return {
    id:createId("strategy"), allocations, eligibleOpportunities, expectedApy:weightedApy.toFixed(2), projectedReturnUsd:annual.toFixed(2),
    riskBefore:portfolio.riskScore, riskAfter:weightedRisk, liquidityBefore:portfolio.liquidUsd, liquidityAfter:liquidityAfter.toFixed(2), status:"DRAFT",
    tradeoffs:{ yieldDelta:weightedApy.minus(portfolio.currentApy).toFixed(2), riskDelta:weightedRisk-portfolio.riskScore, liquidityImpact:liquidityAfter.lt(portfolio.liquidUsd)?"lower":"same", estimatedAnnualGainUsd:annual.toFixed(2) }
  };
}

function rank(o:Opportunity, preference:FinancialIntent["riskPreference"]) { const yieldWeight=preference==="aggressive"?.45:.3; const riskWeight=preference==="conservative"?.45:.3; return Number(o.apy)*10*yieldWeight+(100-o.riskScore)*riskWeight+o.liquidityScore*.2; }
function DecimalMin(...values:(string|import("decimal.js").default)[]) { return values.map(money).reduce((a,b)=>a.lt(b)?a:b); }
function DecimalMax(...values:(string|import("decimal.js").default)[]) { return values.map(money).reduce((a,b)=>a.gt(b)?a:b); }

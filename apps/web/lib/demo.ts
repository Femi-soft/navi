import { explainStrategy } from "@navi/ai";
import { demoOpportunities } from "@navi/opportunities";
import { demoPolicy } from "@navi/policy";
import { demoPortfolio } from "@navi/portfolio";
import { generateStrategy } from "@navi/strategy";

export async function buildDemoDashboard() {
  const [portfolio, opportunities] = await Promise.all([demoPortfolio.read("0x71000000000000000000000000000000000042af"), demoOpportunities.discover()]);
  const strategy = generateStrategy({
    intent: { objective: "yield", capitalUsd: "4000", minimumLiquidUsd: "1000", riskPreference: "conservative", leverageAllowed: false },
    portfolio,
    opportunities,
    policy: demoPolicy
  });
  return { portfolio, opportunities: strategy.eligibleOpportunities, policy: demoPolicy, strategy, agent: explainStrategy(strategy) };
}

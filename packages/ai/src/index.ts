import type { GeneratedStrategy } from "@navi/strategy";

export type AgentIntent = "PORTFOLIO_QUERY"|"RISK_QUERY"|"OPPORTUNITY_QUERY"|"COMPARE_QUERY"|"STRATEGY_REQUEST"|"SIMULATION_REQUEST"|"EXECUTION_REQUEST"|"MONITORING_QUERY"|"GENERAL_FINANCIAL_QUERY";
export function classifyIntent(message:string):AgentIntent {
  const text=message.toLowerCase();
  if (/execute|sign|buy|deposit/.test(text)) return "EXECUTION_REQUEST";
  if (/simulate|what if/.test(text)) return "SIMULATION_REQUEST";
  if (/strategy|allocate|plan/.test(text)) return "STRATEGY_REQUEST";
  if (/compare|versus| vs /.test(text)) return "COMPARE_QUERY";
  if (/opportun|yield|apy|rwa|defi/.test(text)) return "OPPORTUNITY_QUERY";
  if (/risk|safe/.test(text)) return "RISK_QUERY";
  if (/portfolio|balance|own/.test(text)) return "PORTFOLIO_QUERY";
  if (/monitor|alert|change/.test(text)) return "MONITORING_QUERY";
  return "GENERAL_FINANCIAL_QUERY";
}
export function explainStrategy(strategy:GeneratedStrategy) {
  const count=strategy.allocations.length;
  return { message:`This sample plan spreads investable funds across ${count} eligible ${count===1?"opportunity":"opportunities"}, keeps $${strategy.liquidityAfter} liquid, and estimates ${strategy.expectedApy}% APY. The return is not guaranteed; review protocol, liquidity, and counterparty risks before signing.`, components:[{type:"STRATEGY_CARD",strategyId:strategy.id}], suggestedActions:["Review trade-offs","Simulate after connecting"] };
}

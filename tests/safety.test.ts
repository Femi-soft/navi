import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { demoPolicy, evaluateOpportunity, isPolicyAllowed } from "@navi/policy";
import { demoOpportunities } from "@navi/opportunities";
import { demoPortfolio } from "@navi/portfolio";
import { generateStrategy } from "@navi/strategy";
import { demoSimulator } from "@navi/simulation";
import { ExecutionBuilder } from "@navi/execution";

describe("NAVI safety boundaries", () => {
  it("blocks an opportunity above the user's risk limit", async () => {
    const [opportunity] = await demoOpportunities.discover();
    const checks = evaluateOpportunity({ ...opportunity, riskScore: 80 }, "100", demoPolicy, "8420.51");
    assert.equal(isPolicyAllowed(checks), false);
    assert.ok(checks.some(check => check.rule === "maximum-risk" && check.result === "BLOCK"));
  });

  it("keeps allocation under protocol and transaction caps", async () => {
    const portfolio = await demoPortfolio.read("0x71000000000000000000000000000000000042af");
    const opportunities = await demoOpportunities.discover();
    const strategy = generateStrategy({ intent:{ objective:"yield", capitalUsd:"4000", minimumLiquidUsd:"1000", riskPreference:"conservative", leverageAllowed:false }, portfolio, opportunities, policy:demoPolicy });
    assert.ok(strategy.allocations.length > 0);
    assert.ok(strategy.allocations.every(a => Number(a.amountUsd) <= 2000));
    assert.ok(Number(strategy.liquidityAfter) >= 1000);
  });

  it("never accepts demo simulation evidence for transaction preparation", async () => {
    const portfolio = await demoPortfolio.read("0x71000000000000000000000000000000000042af");
    const opportunities = await demoOpportunities.discover();
    const strategy = generateStrategy({ intent:{ objective:"yield", capitalUsd:"4000", minimumLiquidUsd:"1000", riskPreference:"conservative", leverageAllowed:false }, portfolio, opportunities, policy:demoPolicy });
    const simulation = await demoSimulator.simulate(strategy, portfolio, []);
    const builder = new ExecutionBuilder();
    await assert.rejects(
      builder.prepare("anything", { from:"0x71000000000000000000000000000000000042af", target:"0x0000000000000000000000000000000000000001", simulation }),
      /SIMULATION_INVALID_OR_NOT_PROVIDER_VERIFIED/
    );
  });
});

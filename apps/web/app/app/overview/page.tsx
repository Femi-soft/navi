import Link from "next/link";

import { buildDemoDashboard } from "../../../lib/demo";
import { WalletPanel } from "./wallet-panel";

export default async function OverviewPage() {
  const view = await buildDemoDashboard();
  return (
    <main className="shell">
      <aside>
        <div className="brand">NAVI</div>
        <div className="wallet">Public testnet beta<br /><strong>X Layer 1952</strong></div>
        <nav className="side-nav">
          {[["Overview", "overview"], ["Ask NAVI", "agent"], ["Opportunities", "opportunities"], ["Strategy", "strategy"], ["Activity", "activity"], ["Permissions", "policy"]].map(([item, path], index) => (
            <Link className={index === 0 ? "active" : ""} href={`/app/${path}`} key={item}>{item}</Link>
          ))}
        </nav>
        <div className="trust-note">Execution disabled.<br />Contracts are paused and no adapters are approved.</div>
      </aside>
      <section className="content">
        <header>
          <div><p className="eyebrow">NAVI TESTNET</p><h1>Your money, made clearer.</h1></div>
          <span className="demo-pill">X Layer testnet | Chain 1952</span>
        </header>
        <div className="notice">Public testnet beta. Wallet balances are live and sourced; strategies and opportunities below remain sample-only. No transaction execution is enabled.</div>
        <WalletPanel />
        <div className="section-title sample-heading">
          <div><p className="eyebrow">SAMPLE WORKSPACE</p><h3>Strategy preview</h3></div>
          <span>Updated {new Date(view.portfolio.updatedAt).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        <div className="grid summary">
          <article className="balance"><p>Sample portfolio</p><h2>${view.portfolio.totalUsd}</h2><span>${view.portfolio.liquidUsd} ready to use</span></article>
          <article><p>Portfolio risk</p><h2>{view.portfolio.riskScore}<small>/100</small></h2><span className="good">Within sample limit of {view.policy.maxRiskScore}</span></article>
          <article><p>Current blended APY</p><h2>{view.portfolio.currentApy}%</h2><span>Sample estimate, not guaranteed</span></article>
        </div>
        <div className="two-col">
          <article>
            <div className="section-title"><div><p className="eyebrow">SAMPLE STRATEGY</p><h3>A lower-risk yield mix</h3></div><span className="score">{view.strategy.riskAfter}/100 risk</span></div>
            <p>{view.agent.message}</p>
            <div className="allocations">{view.strategy.allocations.map((allocation) => <div key={allocation.opportunityId}><strong>${allocation.amountUsd}</strong><span>{allocation.label}</span></div>)}</div>
            <div className="tradeoff"><span>Expected APY <strong>{view.strategy.expectedApy}%</strong></span><span>Keep liquid <strong>${view.strategy.liquidityAfter}</strong></span><span>Annual estimate <strong>${view.strategy.projectedReturnUsd}</strong></span></div>
            <button disabled>Simulation unavailable</button>
          </article>
          <article>
            <div className="section-title"><h3>Sample guardrails</h3><span className="good">Active</span></div>
            <ul className="rules">
              <li><span>Maximum risk</span><strong>{view.policy.maxRiskScore}/100</strong></li>
              <li><span>Minimum kept liquid</span><strong>${view.policy.minimumLiquidityUsd}</strong></li>
              <li><span>Maximum per protocol</span><strong>{view.policy.maxProtocolExposurePercent}%</strong></li>
              <li><span>RWA opportunities</span><strong>{view.policy.allowRwa ? "Allowed" : "Blocked"}</strong></li>
              <li><span>Leverage</span><strong>{view.policy.allowLeverage ? "Allowed" : "Blocked"}</strong></li>
            </ul>
          </article>
        </div>
        <section>
          <div className="section-title"><h3>Sample opportunities that fit your rules</h3><span>{view.opportunities.length} eligible</span></div>
          <div className="grid opportunities">{view.opportunities.map((opportunity) => (
            <article key={opportunity.id}>
              <span className="market">{opportunity.marketType}</span><h3>{opportunity.label}</h3>
              <p>{opportunity.asset} | {opportunity.protocolId}</p><h2>{opportunity.apy}% <small>APY</small></h2>
              <div className="meter"><i style={{ width: `${opportunity.riskScore}%` }} /></div>
              <span>{opportunity.riskScore}/100 risk | sample from {opportunity.source}</span>
            </article>
          ))}</div>
        </section>
      </section>
    </main>
  );
}

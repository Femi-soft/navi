import { ArrowRight, Check, CircleAlert, Clock3, LockKeyhole, ShieldCheck } from "lucide-react";

import { AppShell } from "../../../components/app-shell";
import { buildDemoDashboard } from "../../../lib/demo";
import { WalletPanel } from "./wallet-panel";

export default async function OverviewPage() {
  const view = await buildDemoDashboard();
  return (
    <AppShell activeSection="overview">
        <header className="workspace-header">
          <div><p className="eyebrow">Workspace</p><h1>Portfolio overview</h1><p className="header-copy">Verified testnet balances and policy-constrained planning in one view.</p></div>
          <div className="header-meta"><span className="live-badge"><span className="status-dot" /> Testnet live</span><span>X Layer · 1952</span></div>
        </header>

        <div className="environment-strip" role="status">
          <div><LockKeyhole aria-hidden="true" size={18} /><span><strong>Execution disabled</strong> Contracts are paused and no adapters are approved.</span></div>
          <span>Audit intake pending</span>
        </div>

        <div className="band-heading">
          <div><p className="eyebrow verified-label">Live testnet data</p><h2>Verified wallet</h2></div>
          <span className="band-caption"><ShieldCheck aria-hidden="true" size={15} /> Provider sourced</span>
        </div>
        <WalletPanel />

        <div className="illustrative-boundary">
          <div><CircleAlert aria-hidden="true" size={18} /><span><strong>Illustrative planning data</strong> Portfolio, strategy, policy, and opportunity figures below are samples and cannot be executed.</span></div>
          <span><Clock3 aria-hidden="true" size={14} /> Refreshed {new Date(view.portfolio.updatedAt).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>

        <div className="band-heading compact-heading">
          <div><p className="eyebrow">Sample workspace</p><h2>Strategy preview</h2></div>
          <span className="draft-badge">Draft, not enforced</span>
        </div>
        <div className="grid summary">
          <article className="metric primary-metric"><p>Sample portfolio value</p><h3>${view.portfolio.totalUsd}</h3><span>${view.portfolio.liquidUsd} liquid USD</span></article>
          <article className="metric"><p>Portfolio risk</p><h3>{view.portfolio.riskScore}<small>/100</small></h3><span className="positive"><Check aria-hidden="true" size={14} /> Below draft limit of {view.policy.maxRiskScore}</span></article>
          <article className="metric"><p>Estimated blended APY</p><h3>{view.portfolio.currentApy}%</h3><span>Illustrative annual rate</span></article>
          <article className="metric"><p>Deployed capital</p><h3>${view.portfolio.deployedUsd}</h3><span>Across sample positions</span></article>
        </div>
        <div className="two-col">
          <article className="strategy-panel">
            <div className="panel-heading"><div><p className="eyebrow">Sample strategy</p><h2>A lower-risk yield mix</h2></div><span className="risk-badge">{view.strategy.riskAfter}/100 risk</span></div>
            <p className="panel-copy">{view.agent.message}</p>
            <div className="allocation-list" aria-label="Proposed allocations">{view.strategy.allocations.map((allocation) => <div className="allocation-row" key={allocation.opportunityId}><span><i aria-hidden="true" /><span><strong>{allocation.label}</strong><small>{allocation.protocolId}</small></span></span><strong>${allocation.amountUsd}</strong></div>)}</div>
            <dl className="tradeoff-grid"><div><dt>Expected APY</dt><dd>{view.strategy.expectedApy}%</dd></div><div><dt>Liquidity after</dt><dd>${view.strategy.liquidityAfter}</dd></div><div><dt>Annual estimate</dt><dd>${view.strategy.projectedReturnUsd}</dd></div></dl>
            <button className="locked-action" disabled><LockKeyhole aria-hidden="true" size={16} /> Execution unavailable during security review</button>
          </article>
          <article className="policy-panel">
            <div className="panel-heading"><div><p className="eyebrow">Draft policy</p><h2>Preview guardrails</h2></div><span className="draft-badge">Not enforced</span></div>
            <ul className="rules" aria-label="Draft policy rules">
              <li><span>Maximum risk</span><strong>{view.policy.maxRiskScore}/100</strong></li>
              <li><span>Minimum kept liquid</span><strong>${view.policy.minimumLiquidityUsd}</strong></li>
              <li><span>Maximum per protocol</span><strong>{view.policy.maxProtocolExposurePercent}%</strong></li>
              <li><span>Maximum transaction</span><strong>${view.policy.maximumTransactionUsd}</strong></li>
              <li><span>RWA opportunities</span><strong>{view.policy.allowRwa ? "Allowed" : "Blocked"}</strong></li>
              <li><span>Leverage</span><strong>{view.policy.allowLeverage ? "Allowed" : "Blocked"}</strong></li>
            </ul>
          </article>
        </div>
        <section className="opportunity-section">
          <div className="panel-heading opportunity-heading"><div><p className="eyebrow">Sample market</p><h2>Opportunities matching preview rules</h2></div><span>{view.opportunities.length} eligible</span></div>
          <div className="opportunity-table" role="table" aria-label="Sample opportunities">
            <div className="opportunity-table-head" role="row"><span>Opportunity</span><span>Market</span><span>Liquidity</span><span>Est. APY</span><span>Risk</span><span aria-hidden="true" /></div>
            {view.opportunities.map((opportunity) => (
              <div className="opportunity-row" role="row" key={opportunity.id}>
                <div role="cell" data-label="Opportunity"><strong>{opportunity.label}</strong><small>{opportunity.asset} · {opportunity.protocolId}</small></div>
                <span role="cell" data-label="Market"><span className={`market market-${opportunity.marketType.toLowerCase()}`}>{opportunity.marketType}</span></span>
                <span role="cell" data-label="Liquidity"><strong>{opportunity.liquidityScore}/100</strong><small>{opportunity.redemptionDays ? `${opportunity.redemptionDays} day redemption` : "On demand"}</small></span>
                <span role="cell" data-label="Estimated APY"><strong>{opportunity.apy}%</strong><small>Not guaranteed</small></span>
                <span role="cell" data-label="Risk"><strong>{opportunity.riskScore}/100</strong><span className="risk-track"><i style={{ width: `${opportunity.riskScore}%` }} /></span></span>
                <span className="row-action" aria-hidden="true"><ArrowRight size={17} /></span>
              </div>
            ))}
          </div>
          <p className="table-source">Source: NAVI_SAMPLE_OPPORTUNITIES · Retrieved {new Date(view.opportunities[0]?.retrievedAt ?? view.portfolio.retrievedAt).toLocaleString()}</p>
        </section>
    </AppShell>
  );
}

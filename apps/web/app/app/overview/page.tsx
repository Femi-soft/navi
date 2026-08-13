import { buildDemoDashboard } from "../../../lib/demo";
import Link from "next/link";

export default async function OverviewPage() {
  const view = await buildDemoDashboard();
  return (
    <main className="shell">
      <aside>
        <div className="brand">NAVI</div>
        <div className="wallet">Demo wallet<br /><strong>0x71…42af</strong></div>
        <nav className="side-nav">
          {[['Overview','overview'], ['Ask NAVI','agent'], ['Opportunities','opportunities'], ['Strategy','strategy'], ['Activity','activity'], ['Permissions','policy']].map(([item, path], i) => <Link className={i === 0 ? 'active' : ''} href={`/app/${path}`} key={item}>{item}</Link>)}
        </nav>
        <div className="trust-note">You stay in control.<br />Every action needs your approval.</div>
      </aside>
      <section className="content">
        <header><div><p className="eyebrow">GOOD EVENING</p><h1>Your money, made clearer.</h1></div><span className="demo-pill">Sample data · {new Date(view.portfolio.updatedAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</span></header>
        <div className="notice">This is a scaffold using labelled sample data. No live wallet or transactions are connected.</div>
        <div className="grid summary">
          <article className="balance"><p>Total portfolio</p><h2>${view.portfolio.totalUsd}</h2><span>${view.portfolio.liquidUsd} ready to use</span></article>
          <article><p>Portfolio risk</p><h2>{view.portfolio.riskScore}<small>/100</small></h2><span className="good">Within your limit of {view.policy.maxRiskScore}</span></article>
          <article><p>Current blended APY</p><h2>{view.portfolio.currentApy}%</h2><span>Estimated, not guaranteed</span></article>
        </div>
        <div className="two-col">
          <article>
            <div className="section-title"><div><p className="eyebrow">NAVI FOUND SOMETHING</p><h3>A lower-risk yield mix</h3></div><span className="score">{view.strategy.riskAfter}/100 risk</span></div>
            <p>{view.agent.message}</p>
            <div className="allocations">{view.strategy.allocations.map(a => <div key={a.opportunityId}><strong>${a.amountUsd}</strong><span>{a.label}</span></div>)}</div>
            <div className="tradeoff"><span>Expected APY <strong>{view.strategy.expectedApy}%</strong></span><span>Keep liquid <strong>${view.strategy.liquidityAfter}</strong></span><span>Annual estimate <strong>${view.strategy.projectedReturnUsd}</strong></span></div>
            <button disabled>Connect wallet to simulate</button>
          </article>
          <article>
            <div className="section-title"><h3>Your guardrails</h3><span className="good">Active</span></div>
            <ul className="rules">
              <li><span>Maximum risk</span><strong>{view.policy.maxRiskScore}/100</strong></li>
              <li><span>Minimum kept liquid</span><strong>${view.policy.minimumLiquidityUsd}</strong></li>
              <li><span>Maximum per protocol</span><strong>{view.policy.maxProtocolExposurePercent}%</strong></li>
              <li><span>RWA opportunities</span><strong>{view.policy.allowRwa ? 'Allowed' : 'Blocked'}</strong></li>
              <li><span>Leverage</span><strong>{view.policy.allowLeverage ? 'Allowed' : 'Blocked'}</strong></li>
            </ul>
          </article>
        </div>
        <section><div className="section-title"><h3>Opportunities that fit your rules</h3><span>{view.opportunities.length} eligible</span></div><div className="grid opportunities">{view.opportunities.map(o => <article key={o.id}><span className="market">{o.marketType}</span><h3>{o.label}</h3><p>{o.asset} · {o.protocolId}</p><h2>{o.apy}% <small>APY</small></h2><div className="meter"><i style={{width: `${o.riskScore}%`}} /></div><span>{o.riskScore}/100 risk · data from {o.source}</span></article>)}</div></section>
      </section>
    </main>
  );
}

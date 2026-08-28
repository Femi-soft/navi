import { ArrowRight, CircleAlert, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "../../../components/app-shell";
import { buildDemoDashboard } from "../../../lib/demo";
import { WalletPanel } from "../overview/wallet-panel";
import { ActivityWorkspace, OpportunityExplorer, PolicyWorkspace } from "./feature-workspaces";

const validSections = new Set(["portfolio", "opportunities", "strategy", "activity", "policy"]);

function Header({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <header className="workspace-header">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="header-copy">{copy}</p></div>
      <div className="header-meta"><span className="live-badge"><span className="status-dot" /> Testnet active</span><span>X Layer / 1952</span></div>
    </header>
  );
}

function SampleBoundary({ retrievedAt }: { retrievedAt: string }) {
  return (
    <div className="illustrative-boundary">
      <div><CircleAlert aria-hidden="true" size={18} /><span><strong>Sample workspace</strong> Values below are illustrative, sourced, and non-executable.</span></div>
      <span>{new Date(retrievedAt).toLocaleString()}</span>
    </div>
  );
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!validSections.has(section)) notFound();
  const view = await buildDemoDashboard();

  return (
    <AppShell activeSection={section}>
      {section === "portfolio" ? <>
        <Header eyebrow="Assets" title="Portfolio" copy="Authenticate a wallet to read its verified testnet OKB balance and keep sample allocations visibly separate." />
        <div className="band-heading"><div><p className="eyebrow verified-label">Provider sourced</p><h2>Verified wallet</h2></div><span className="band-caption"><ShieldCheck aria-hidden="true" size={15} /> Live on request</span></div>
        <WalletPanel />
        <SampleBoundary retrievedAt={view.portfolio.retrievedAt} />
        <div className="grid summary feature-summary">
          <article className="metric primary-metric"><p>Sample total</p><h3>${view.portfolio.totalUsd}</h3><span>Illustrative USD portfolio</span></article>
          <article className="metric"><p>Sample liquid</p><h3>${view.portfolio.liquidUsd}</h3><span>Available in the model</span></article>
          <article className="metric"><p>Sample deployed</p><h3>${view.portfolio.deployedUsd}</h3><span>Not an onchain position</span></article>
          <article className="metric"><p>Sample risk</p><h3>{view.portfolio.riskScore}<small>/100</small></h3><span>Deterministic score</span></article>
        </div>
        <section className="feature-band">
          <div className="panel-heading"><div><p className="eyebrow">Illustrative allocation</p><h2>Asset mix</h2></div><span className="draft-badge">Sample only</span></div>
          <div className="allocation-list feature-allocation">
            {Object.entries(view.portfolio.allocation).map(([assetClass, value]) => <div className="allocation-row" key={assetClass}><span><i aria-hidden="true" /><span><strong>{assetClass}</strong><small>NAVI_SAMPLE_PORTFOLIO</small></span></span><strong>${value}</strong></div>)}
          </div>
        </section>
      </> : null}

      {section === "opportunities" ? <>
        <Header eyebrow="Market explorer" title="Opportunities" copy="Compare normalized DeFi and RWA examples by yield, liquidity, risk, and redemption terms." />
        <SampleBoundary retrievedAt={view.opportunities[0]?.retrievedAt ?? view.portfolio.retrievedAt} />
        <OpportunityExplorer opportunities={view.opportunities} />
      </> : null}

      {section === "strategy" ? <>
        <Header eyebrow="Deterministic engine" title="Strategy" copy="Review the allocation produced by NAVI's policy-constrained strategy engine without handing calculations to AI." />
        <SampleBoundary retrievedAt={view.portfolio.retrievedAt} />
        <div className="grid summary feature-summary">
          <article className="metric primary-metric"><p>Expected APY</p><h3>{view.strategy.expectedApy}%</h3><span>Estimate, not guaranteed</span></article>
          <article className="metric"><p>Risk after</p><h3>{view.strategy.riskAfter}<small>/100</small></h3><span>Draft maximum {view.policy.maxRiskScore}</span></article>
          <article className="metric"><p>Liquidity after</p><h3>${view.strategy.liquidityAfter}</h3><span>Sample portfolio impact</span></article>
          <article className="metric"><p>Annual estimate</p><h3>${view.strategy.projectedReturnUsd}</h3><span>Illustrative projection</span></article>
        </div>
        <div className="two-col feature-columns">
          <article className="strategy-panel">
            <div className="panel-heading"><div><p className="eyebrow">Generated draft</p><h2>Conservative yield allocation</h2></div><span className="risk-badge">{view.strategy.status}</span></div>
            <p className="panel-copy">{view.agent.message}</p>
            <div className="allocation-list">{view.strategy.allocations.map((allocation) => <div className="allocation-row" key={allocation.opportunityId}><span><i aria-hidden="true" /><span><strong>{allocation.label}</strong><small>{allocation.protocolId} / risk {allocation.riskScore}</small></span></span><strong>${allocation.amountUsd}</strong></div>)}</div>
            <button className="locked-action" disabled><LockKeyhole aria-hidden="true" size={16} /> Transaction preparation locked</button>
          </article>
          <article className="policy-panel">
            <div className="panel-heading"><div><p className="eyebrow">Trade-offs</p><h2>Deterministic result</h2></div><span className="draft-badge">Not persisted</span></div>
            <ul className="rules">
              <li><span>Yield delta</span><strong>{view.strategy.tradeoffs.yieldDelta}%</strong></li>
              <li><span>Risk delta</span><strong>{view.strategy.tradeoffs.riskDelta}</strong></li>
              <li><span>Liquidity impact</span><strong>{view.strategy.tradeoffs.liquidityImpact}</strong></li>
              <li><span>Eligible markets</span><strong>{view.strategy.eligibleOpportunities.length}</strong></li>
            </ul>
            <Link className="text-command" href="/app/agent">Discuss with Ask NAVI <ArrowRight aria-hidden="true" size={15} /></Link>
          </article>
        </div>
      </> : null}

      {section === "activity" ? <>
        <Header eyebrow="Verification" title="Activity" copy="Inspect current network and execution posture without treating a submitted transaction as final." />
        <ActivityWorkspace />
      </> : null}

      {section === "policy" ? <>
        <Header eyebrow="Guardrails" title="Permissions" copy="Explore risk and transaction constraints as a local draft before authenticated persistence is introduced." />
        <PolicyWorkspace initialPolicy={view.policy} />
      </> : null}
    </AppShell>
  );
}

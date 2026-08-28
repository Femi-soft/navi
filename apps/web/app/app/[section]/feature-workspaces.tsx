"use client";

import { Activity, Check, CircleAlert, ExternalLink, LockKeyhole, RefreshCw, RotateCcw, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Opportunity = {
  id: string; label: string; marketType: "DEFI" | "RWA"; protocolId: string; asset: string;
  apy: string; riskScore: number; liquidityScore: number; tvlUsd?: string; redemptionDays?: number;
  executable: boolean; source: string; retrievedAt: string;
};

type PolicyDraft = {
  maxRiskScore: number; minimumLiquidityUsd: string; maxProtocolExposurePercent: number;
  maxSlippageBps: number; maximumTransactionUsd: string; allowRwa: boolean; allowLeverage: boolean;
};

type Health = {
  status: string; mode: string; networkLabel: string; executionEnabled: boolean; productionReady: boolean;
  rpc: { verified: boolean; chainId: number | null; latestBlockAgeSeconds: number | null; latencyMs: number | null };
};

export function OpportunityExplorer({ opportunities }: { opportunities: Opportunity[] }) {
  const [market, setMarket] = useState<"ALL" | "DEFI" | "RWA">("ALL");
  const [selectedId, setSelectedId] = useState(opportunities[0]?.id ?? "");
  const filtered = useMemo(() => opportunities.filter((item) => market === "ALL" || item.marketType === market), [market, opportunities]);
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0];

  return <>
    <div className="feature-toolbar">
      <div className="segmented" aria-label="Market filter">{(["ALL", "DEFI", "RWA"] as const).map((value) => <button type="button" className={market === value ? "active" : ""} aria-pressed={market === value} onClick={() => setMarket(value)} key={value}>{value === "ALL" ? "All markets" : value}</button>)}</div>
      <span>{filtered.length} sample {filtered.length === 1 ? "market" : "markets"}</span>
    </div>
    <div className="opportunity-table" role="table" aria-label="Sample opportunity explorer">
      <div className="opportunity-table-head feature-table-head" role="row"><span>Opportunity</span><span>Market</span><span>Liquidity</span><span>Est. APY</span><span>Risk</span><span /></div>
      {filtered.map((item) => <div className={`opportunity-row feature-opportunity-row ${selected?.id === item.id ? "selected" : ""}`} role="row" key={item.id}>
        <div role="cell" data-label="Opportunity"><strong>{item.label}</strong><small>{item.asset} / {item.protocolId}</small></div>
        <span role="cell" data-label="Market"><span className={`market market-${item.marketType.toLowerCase()}`}>{item.marketType}</span></span>
        <span role="cell" data-label="Liquidity"><strong>{item.liquidityScore}/100</strong><small>{item.redemptionDays ? `${item.redemptionDays} day redemption` : "On demand"}</small></span>
        <span role="cell" data-label="Estimated APY"><strong>{item.apy}%</strong><small>Not guaranteed</small></span>
        <span role="cell" data-label="Risk"><strong>{item.riskScore}/100</strong><span className="risk-track"><i style={{ width: `${item.riskScore}%` }} /></span></span>
        <button type="button" className="icon-command" title={`Inspect ${item.label}`} aria-label={`Inspect ${item.label}`} onClick={() => setSelectedId(item.id)}><Search aria-hidden="true" size={16} /></button>
      </div>)}
    </div>
    {selected ? <section className="inspection-band">
      <div><p className="eyebrow">Selected sample</p><h2>{selected.label}</h2><p>{selected.asset} via {selected.protocolId}. This item has no approved execution adapter.</p></div>
      <dl><div><dt>TVL</dt><dd>${selected.tvlUsd ?? "Unavailable"}</dd></div><div><dt>Liquidity</dt><dd>{selected.liquidityScore}/100</dd></div><div><dt>Executable</dt><dd>No</dd></div></dl>
      <p className="table-source">Source: {selected.source} / Retrieved {new Date(selected.retrievedAt).toLocaleString()}</p>
    </section> : null}
  </>;
}

export function ActivityWorkspace() {
  const [health, setHealth] = useState<Health | null>(null);
  const [retrievedAt, setRetrievedAt] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true); setError(false);
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      if (!response.ok) throw new Error("HEALTH_UNAVAILABLE");
      setHealth(await response.json() as Health); setRetrievedAt(new Date().toISOString());
    } catch { setError(true); }
    finally { setBusy(false); }
  }

  useEffect(() => { void refresh(); }, []);

  return <>
    <div className="feature-toolbar"><div><p className="eyebrow">Current posture</p><h2>Network and execution checks</h2></div><button className="secondary icon-command" type="button" onClick={() => void refresh()} disabled={busy} title="Refresh checks" aria-label="Refresh checks"><RefreshCw className={busy ? "spinner" : ""} aria-hidden="true" size={17} /></button></div>
    {error ? <div className="agent-error" role="alert"><CircleAlert aria-hidden="true" size={17} /> Monitoring state is temporarily unavailable.</div> : null}
    <div className="activity-grid">
      <article><ShieldCheck aria-hidden="true" size={20} /><div><span>RPC verification</span><strong>{health?.rpc.verified ? "Verified" : busy ? "Checking" : "Unavailable"}</strong><small>Chain {health?.rpc.chainId ?? "-"} / {health?.rpc.latestBlockAgeSeconds ?? "-"}s block age</small></div></article>
      <article><Activity aria-hidden="true" size={20} /><div><span>Public environment</span><strong>{health?.mode ?? (busy ? "Checking" : "Unavailable")}</strong><small>{health?.networkLabel ?? "X Layer Testnet"}</small></div></article>
      <article><LockKeyhole aria-hidden="true" size={20} /><div><span>Execution</span><strong>{health?.executionEnabled ? "Enabled" : "Locked"}</strong><small>No transaction broadcast route</small></div></article>
    </div>
    <section className="activity-ledger">
      <div className="panel-heading"><div><p className="eyebrow">Receipt ledger</p><h2>User activity</h2></div><span className="live-badge"><Check aria-hidden="true" size={13} /> No optimistic settlement</span></div>
      <div className="empty-state"><Activity aria-hidden="true" size={24} /><strong>No authenticated execution feed yet</strong><p>Stored execution records are not exposed on this public testnet surface. Submitted actions must be receipt-verified before display.</p></div>
      <p className="table-source">Source: NAVI_HEALTH_ENDPOINT / Retrieved {retrievedAt ? new Date(retrievedAt).toLocaleString() : "pending"}</p>
    </section>
  </>;
}

export function PolicyWorkspace({ initialPolicy }: { initialPolicy: PolicyDraft }) {
  const [draft, setDraft] = useState(initialPolicy);
  const update = <K extends keyof PolicyDraft>(key: K, value: PolicyDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const updateMoney = (key: "minimumLiquidityUsd" | "maximumTransactionUsd", value: string) => {
    if (/^\d*(?:\.\d{0,6})?$/.test(value)) update(key, value);
  };

  return <>
    <div className="environment-strip"><div><LockKeyhole aria-hidden="true" size={18} /><span><strong>Browser draft only</strong> These controls are not persisted, committed onchain, or enforced.</span></div><span>Execution locked</span></div>
    <div className="policy-workspace">
      <section className="policy-editor">
        <div className="panel-heading"><div><p className="eyebrow">Draft controls</p><h2>Risk and transaction limits</h2></div><button type="button" className="secondary icon-command" onClick={() => setDraft(initialPolicy)} title="Reset draft" aria-label="Reset draft"><RotateCcw aria-hidden="true" size={16} /></button></div>
        <label><span>Maximum risk <strong>{draft.maxRiskScore}/100</strong></span><input type="range" min="1" max="100" value={draft.maxRiskScore} onChange={(event) => update("maxRiskScore", Number(event.target.value))} /></label>
        <label><span>Maximum protocol exposure <strong>{draft.maxProtocolExposurePercent}%</strong></span><input type="range" min="1" max="100" value={draft.maxProtocolExposurePercent} onChange={(event) => update("maxProtocolExposurePercent", Number(event.target.value))} /></label>
        <div className="field-grid">
          <label><span>Minimum liquidity (USD)</span><input type="text" inputMode="decimal" value={draft.minimumLiquidityUsd} onChange={(event) => updateMoney("minimumLiquidityUsd", event.target.value)} /></label>
          <label><span>Maximum transaction (USD)</span><input type="text" inputMode="decimal" value={draft.maximumTransactionUsd} onChange={(event) => updateMoney("maximumTransactionUsd", event.target.value)} /></label>
          <label><span>Maximum slippage (bps)</span><input type="number" min="0" max="10000" value={draft.maxSlippageBps} onChange={(event) => update("maxSlippageBps", Number(event.target.value))} /></label>
        </div>
        <label className="toggle-row"><span><strong>Allow RWA opportunities</strong><small>Include eligible real-world asset markets</small></span><input type="checkbox" checked={draft.allowRwa} onChange={(event) => update("allowRwa", event.target.checked)} /></label>
        <label className="toggle-row"><span><strong>Allow leverage</strong><small>Disabled in the current baseline</small></span><input type="checkbox" checked={draft.allowLeverage} onChange={(event) => update("allowLeverage", event.target.checked)} /></label>
      </section>
      <aside className="policy-preview">
        <ShieldCheck aria-hidden="true" size={22} />
        <p className="eyebrow">Draft summary</p><h2>Policy preview</h2>
        <ul className="rules"><li><span>Risk ceiling</span><strong>{draft.maxRiskScore}/100</strong></li><li><span>Liquidity floor</span><strong>${draft.minimumLiquidityUsd || "0"}</strong></li><li><span>Protocol cap</span><strong>{draft.maxProtocolExposurePercent}%</strong></li><li><span>Transaction cap</span><strong>${draft.maximumTransactionUsd || "0"}</strong></li><li><span>RWA</span><strong>{draft.allowRwa ? "Allowed" : "Blocked"}</strong></li><li><span>Leverage</span><strong>{draft.allowLeverage ? "Allowed" : "Blocked"}</strong></li></ul>
        <Link className="text-command" href="/app/agent">Open Ask NAVI <ExternalLink aria-hidden="true" size={15} /></Link>
      </aside>
    </div>
  </>;
}

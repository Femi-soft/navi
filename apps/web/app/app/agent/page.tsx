import { Bot, LockKeyhole, ShieldCheck } from "lucide-react";

import { AppShell } from "../../../components/app-shell";
import { AgentChat } from "./agent-chat";

export default function AgentPage() {
  return (
    <AppShell activeSection="agent">
      <header className="workspace-header agent-header">
        <div>
          <p className="eyebrow">Decision assistant</p>
          <h1>Ask NAVI</h1>
          <p className="header-copy">Understand your verified testnet balance and explore clearly labeled sample DeFi/RWA data.</p>
        </div>
        <div className="header-meta">
          <span className="live-badge"><Bot aria-hidden="true" size={14} /> AI interpretation</span>
          <span><LockKeyhole aria-hidden="true" size={14} /> Execution locked</span>
        </div>
      </header>

      <div className="environment-strip agent-boundary" role="status">
        <div><ShieldCheck aria-hidden="true" size={18} /><span><strong>Evidence stays in control.</strong> NAVI can explain sourced engine data, but it cannot calculate balances, bypass policy, or authorize transactions.</span></div>
        <span>X Layer Testnet</span>
      </div>

      <AgentChat />
    </AppShell>
  );
}

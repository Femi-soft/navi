"use client";

import {
  Activity,
  Bot,
  ChartNoAxesCombined,
  CircleGauge,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

const navigation = [
  { label: "Overview", path: "overview", icon: CircleGauge },
  { label: "Portfolio", path: "portfolio", icon: WalletCards },
  { label: "Ask NAVI", path: "agent", icon: Bot },
  { label: "Opportunities", path: "opportunities", icon: Landmark },
  { label: "Strategy", path: "strategy", icon: ChartNoAxesCombined },
  { label: "Activity", path: "activity", icon: Activity },
  { label: "Permissions", path: "policy", icon: ShieldCheck },
] as const;

function NavLinks({ activeSection }: { activeSection: string }) {
  return navigation.map(({ label, path, icon: Icon }) => (
    <Link
      className={activeSection === path ? "active" : undefined}
      href={`/app/${path}`}
      key={path}
      aria-current={activeSection === path ? "page" : undefined}
    >
      <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
      <span>{label}</span>
    </Link>
  ));
}

export function AppShell({ activeSection, children }: { activeSection: string; children: React.ReactNode }) {
  return (
    <main className="shell">
      <aside className="app-sidebar">
        <Link href="/app/overview" className="brand" aria-label="NAVI overview">
          <span className="brand-mark">N</span>
          <span>NAVI</span>
        </Link>
        <div className="network-card">
          <span className="status-dot" aria-hidden="true" />
          <div><small>Environment</small><strong>X Layer Testnet</strong><span>Chain 1952</span></div>
        </div>
        <nav className="side-nav" aria-label="Primary navigation">
          <NavLinks activeSection={activeSection} />
        </nav>
        <div className="security-state">
          <LockKeyhole aria-hidden="true" size={17} />
          <div><strong>Execution locked</strong><span>Security review in progress</span></div>
        </div>
      </aside>

      <div className="mobile-shell-header">
        <Link href="/app/overview" className="brand" aria-label="NAVI overview">
          <span className="brand-mark">N</span><span>NAVI</span>
        </Link>
        <span className="mobile-security"><LockKeyhole aria-hidden="true" size={14} /> Locked</span>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <NavLinks activeSection={activeSection} />
      </nav>

      <section className="content">{children}</section>
    </main>
  );
}

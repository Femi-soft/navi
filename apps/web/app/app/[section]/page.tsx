import Link from "next/link";
import { notFound } from "next/navigation";

const sections: Record<string, { title: string; description: string; next: string }> = {
  agent: { title: "Ask NAVI", description: "The agent will interpret your goal and explain verified engine results in plain language.", next: "Connect an LLM provider after tool schemas and prompt-injection tests are in place." },
  opportunities: { title: "Opportunities", description: "Compare normalized DeFi and RWA choices using yield, risk, liquidity, and redemption terms.", next: "Replace labelled sample providers with timestamped live data feeds." },
  strategy: { title: "Strategy", description: "Review deterministic allocations and the impact on yield, risk, liquidity, and concentration.", next: "Persist confirmed intents and generated strategies." },
  portfolio: { title: "Portfolio", description: "A unified view of wallet assets, DeFi positions, and tokenized real-world assets.", next: "Add X Layer readers, price sources, and portfolio snapshots." },
  activity: { title: "Activity", description: "Track prepared, signed, submitted, confirmed, failed, and expired actions without optimistic settlement.", next: "Add durable execution tracking and receipt verification." },
  policy: { title: "Permissions", description: "Set risk, liquidity, asset, protocol, slippage, transaction-size, RWA, and leverage guardrails.", next: "Add authenticated policy persistence and optional onchain commitments." }
};

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const content = sections[section];
  if (!content) notFound();
  return (
    <main className="placeholder">
      <Link href="/app/overview" className="eyebrow">← Back to overview</Link>
      <p className="eyebrow">SCAFFOLDED MODULE</p>
      <h1>{content.title}</h1>
      <p className="lede">{content.description}</p>
      <article><strong>Next integration gate</strong><p>{content.next}</p></article>
    </main>
  );
}

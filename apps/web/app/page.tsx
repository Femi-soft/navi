import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="landing">
      <nav><span className="brand">NAVI</span><span className="demo-pill">Architecture scaffold</span></nav>
      <section className="hero">
        <p className="eyebrow">YOUR CRYPTO DECISION LAYER</p>
        <h1>Know where you stand.<br />See what could be better.</h1>
        <p className="lede">NAVI turns wallets, goals, risk limits, and market opportunities into plain-language choices you can inspect before you sign.</p>
        <Link className="primary" href="/app/overview">Explore the demo</Link>
        <p className="fineprint">Demo data only · NAVI never holds your keys</p>
      </section>
    </main>
  );
}

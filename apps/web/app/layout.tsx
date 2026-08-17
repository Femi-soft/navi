import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "NAVI | X Layer testnet beta",
  description: "Connect a wallet, inspect verified testnet balances, and explore policy-constrained strategies.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

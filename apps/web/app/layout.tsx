import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAVI — Your crypto decision layer",
  description: "Understand, compare, and safely simulate crypto opportunities."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

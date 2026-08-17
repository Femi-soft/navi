import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const scriptPolicy = process.env.NODE_ENV === "development" ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'";
    return [{
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: `default-src 'self'; ${scriptPolicy}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
  transpilePackages: [
    "@navi/core",
    "@navi/portfolio",
    "@navi/opportunities",
    "@navi/risk",
    "@navi/policy",
    "@navi/strategy",
    "@navi/simulation",
    "@navi/execution",
    "@navi/ai",
    "@navi/database"
  ]
};

export default nextConfig;

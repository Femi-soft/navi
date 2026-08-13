import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@navi/core",
    "@navi/portfolio",
    "@navi/opportunities",
    "@navi/risk",
    "@navi/policy",
    "@navi/strategy",
    "@navi/simulation",
    "@navi/execution",
    "@navi/ai"
  ]
};

export default nextConfig;

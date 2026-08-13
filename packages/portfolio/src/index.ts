import type { Portfolio } from "@navi/core";

export interface PortfolioProvider { read(wallet: string): Promise<Portfolio> }

export const demoPortfolio: PortfolioProvider = {
  async read(wallet) {
    const retrievedAt = new Date().toISOString();
    return {
      wallet, chainId: 196, totalUsd: "8420.51", liquidUsd: "3100.00", deployedUsd: "5320.51",
      currentApy: "4.18", riskScore: 23, updatedAt: retrievedAt,
      allocation: { stablecoins: "4600.00", defi: "2320.51", rwa: "1000.00", volatile: "500.00" },
      source: "NAVI_SAMPLE_PORTFOLIO", retrievedAt
    };
  }
};

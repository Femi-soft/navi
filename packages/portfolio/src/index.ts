import { formatEther, getAddress } from "viem";
import type { Portfolio } from "@navi/core";

export interface PortfolioProvider { read(wallet: string): Promise<Portfolio> }

export interface NativePrice extends Record<"source" | "retrievedAt", string> { usd: string }
export interface NativePriceProvider { readNativeUsd(): Promise<NativePrice> }
export interface BalanceReader { getChainId():Promise<number>; getBalance(input:{address:`0x${string}`}):Promise<bigint> }

export function parseCoinGeckoOkbPrice(raw:string, source:string, maxAgeMs:number, now=Date.now()) {
  const usd=raw.match(/"okb"\s*:\s*\{[^}]*"usd"\s*:\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/)?.[1];
  const updated=raw.match(/"okb"\s*:\s*\{[^}]*"last_updated_at"\s*:\s*(\d+)/)?.[1];
  if (!usd || !updated) throw new Error("PRICE_PROVIDER_INVALID_RESPONSE");
  const retrievedAt=new Date(Number(updated)*1_000).toISOString();
  if (!Number.isFinite(new Date(retrievedAt).getTime()) || now-new Date(retrievedAt).getTime()>maxAgeMs) throw new Error("STALE_PRICE_DATA");
  return { usd, source:`COINGECKO_OKB_USD:${source}`, retrievedAt };
}

export class XLayerNativePortfolioProvider implements PortfolioProvider {
  private readonly client: BalanceReader;
  private readonly prices: NativePriceProvider;
  private readonly expectedChainId: number;
  constructor(client: BalanceReader, prices: NativePriceProvider, expectedChainId=196) { this.client = client; this.prices = prices; this.expectedChainId = expectedChainId; }
  async read(wallet: string): Promise<Portfolio> {
    const address = getAddress(wallet);
    const [chainId, balance, price] = await Promise.all([this.client.getChainId(), this.client.getBalance({ address }), this.prices.readNativeUsd()]);
    if (chainId !== this.expectedChainId) throw new Error("WRONG_NETWORK");
    const retrievedAt = new Date().toISOString();
    const native = new (await import("decimal.js")).default(formatEther(balance));
    const total = native.mul(price.usd).toFixed(2);
    return {
      wallet:address, chainId, totalUsd:total, liquidUsd:total, deployedUsd:"0.00", currentApy:"0.00", riskScore:0,
      nativeBalance:native.toFixed(), nativeSymbol:"OKB",
      updatedAt:retrievedAt, allocation:{ stablecoins:"0.00", defi:"0.00", rwa:"0.00", volatile:total },
      source:`X_LAYER_RPC_NATIVE_BALANCE+${price.source}`, retrievedAt
    };
  }
}

export const demoPortfolio: PortfolioProvider = {
  async read(wallet) {
    const retrievedAt = new Date().toISOString();
    return {
      wallet, chainId: 196, totalUsd: "8420.51", liquidUsd: "3100.00", deployedUsd: "5320.51",
      nativeBalance:"0.00", nativeSymbol:"OKB",
      currentApy: "4.18", riskScore: 23, updatedAt: retrievedAt,
      allocation: { stablecoins: "4600.00", defi: "2320.51", rwa: "1000.00", volatile: "500.00" },
      source: "NAVI_SAMPLE_PORTFOLIO", retrievedAt
    };
  }
};

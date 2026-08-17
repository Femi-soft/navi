import { createPublicClient, http } from "viem";
import { parseCoinGeckoOkbPrice, XLayerNativePortfolioProvider, type NativePriceProvider } from "@navi/portfolio";
import { readProductionConfig } from "./config";

export class CoinGeckoNativePriceProvider implements NativePriceProvider {
  private readonly url:string;
  private readonly apiKey:string | undefined;
  private readonly maxAgeMs:number;
  constructor(url:string, apiKey?:string, maxAgeSeconds=180) { this.url=url; this.apiKey=apiKey; this.maxAgeMs=maxAgeSeconds*1_000; }
  async readNativeUsd() {
    const parsedUrl=new URL(this.url);
    const keyHeader=parsedUrl.hostname === "pro-api.coingecko.com" ? "x-cg-pro-api-key" : parsedUrl.hostname === "api.coingecko.com" ? "x-cg-demo-api-key" : null;
    if (!keyHeader || parsedUrl.searchParams.get("ids") !== "okb" || parsedUrl.searchParams.get("vs_currencies") !== "usd" || parsedUrl.searchParams.get("include_last_updated_at") !== "true") throw new Error("PRICE_PROVIDER_URL_INVALID");
    if (parsedUrl.hostname === "pro-api.coingecko.com" && !this.apiKey) throw new Error("PRICE_PROVIDER_KEY_REQUIRED");
    const headers: Record<string, string> = { accept:"application/json" };
    if (this.apiKey) headers[keyHeader] = this.apiKey;
    const response = await fetch(this.url, { headers, cache:"no-store", signal:AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error("PRICE_PROVIDER_UNAVAILABLE");
    return parseCoinGeckoOkbPrice(await response.text(), parsedUrl.hostname, this.maxAgeMs);
  }
}

export function livePortfolioProvider() {
  const config = readProductionConfig();
  return new XLayerNativePortfolioProvider(createPublicClient({ transport:http(config.rpcUrl) }), new CoinGeckoNativePriceProvider(config.PRICE_API_URL, config.PRICE_API_KEY, config.PRICE_MAX_AGE_SECONDS), config.chainId);
}

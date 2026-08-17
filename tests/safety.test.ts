import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { demoPolicy, evaluateOpportunity, isPolicyAllowed } from "@navi/policy";
import { demoOpportunities } from "@navi/opportunities";
import { demoPortfolio } from "@navi/portfolio";
import { generateStrategy } from "@navi/strategy";
import { demoSimulator } from "@navi/simulation";
import { ExecutionBuilder } from "@navi/execution";
import type { AuthStore, NonceRecord } from "@navi/database";
import { issueWalletChallenge, verifyWalletChallenge } from "../apps/web/lib/server/auth.ts";
import { privateKeyToAccount } from "viem/accounts";
import { productionReadiness, readProductionConfig } from "../apps/web/lib/server/config.ts";
import { parseCoinGeckoOkbPrice } from "@navi/portfolio";

class MemoryAuthStore implements AuthStore {
  nonces = new Map<string, NonceRecord & { consumed:boolean }>();
  async issueNonce(record: NonceRecord) { this.nonces.set(record.nonceHash, { ...record, consumed:false }); }
  async consumeNonce(nonceHash:string, address:`0x${string}`, now:string) {
    const record=this.nonces.get(nonceHash);
    if (!record || record.consumed || record.address.toLowerCase() !== address.toLowerCase() || record.expiresAt <= now) return false;
    record.consumed=true; return true;
  }
  async upsertVerifiedWallet() { return "00000000-0000-4000-8000-000000000001"; }
}

describe("NAVI safety boundaries", () => {
  it("blocks an opportunity above the user's risk limit", async () => {
    const [opportunity] = await demoOpportunities.discover();
    const checks = evaluateOpportunity({ ...opportunity, riskScore: 80 }, "100", demoPolicy, "8420.51");
    assert.equal(isPolicyAllowed(checks), false);
    assert.ok(checks.some(check => check.rule === "maximum-risk" && check.result === "BLOCK"));
  });

  it("keeps allocation under protocol and transaction caps", async () => {
    const portfolio = await demoPortfolio.read("0x71000000000000000000000000000000000042af");
    const opportunities = await demoOpportunities.discover();
    const strategy = generateStrategy({ intent:{ objective:"yield", capitalUsd:"4000", minimumLiquidUsd:"1000", riskPreference:"conservative", leverageAllowed:false }, portfolio, opportunities, policy:demoPolicy });
    assert.ok(strategy.allocations.length > 0);
    assert.ok(strategy.allocations.every(a => Number(a.amountUsd) <= 2000));
    assert.ok(Number(strategy.liquidityAfter) >= 1000);
  });

  it("never accepts demo simulation evidence for transaction preparation", async () => {
    const portfolio = await demoPortfolio.read("0x71000000000000000000000000000000000042af");
    const opportunities = await demoOpportunities.discover();
    const strategy = generateStrategy({ intent:{ objective:"yield", capitalUsd:"4000", minimumLiquidUsd:"1000", riskPreference:"conservative", leverageAllowed:false }, portfolio, opportunities, policy:demoPolicy });
    const simulation = await demoSimulator.simulate(strategy, portfolio, []);
    const builder = new ExecutionBuilder();
    await assert.rejects(
      builder.prepare("anything", { from:"0x71000000000000000000000000000000000042af", target:"0x0000000000000000000000000000000000000001", simulation }),
      /SIMULATION_INVALID_OR_NOT_PROVIDER_VERIFIED/
    );
  });

  it("fails closed when production credentials are absent", () => {
    assert.equal(productionReadiness({}).ready, false);
    assert.throws(() => readProductionConfig({}), /PRODUCTION_CONFIG_INVALID/);
  });

  it("keeps testnet and mainnet provider gates separate", () => {
    const shared = {
      APP_ORIGIN:"https://navi.example",
      SESSION_SECRET:"a-production-length-session-secret-1234567890",
      SUPABASE_URL:"https://example.supabase.co",
      SUPABASE_SECRET_KEY:"a-server-only-supabase-secret-key",
      PRICE_API_URL:"https://api.coingecko.com/api/v3/simple/price?ids=okb&vs_currencies=usd&include_last_updated_at=true",
    };
    const testnet = readProductionConfig({ ...shared, NAVI_NETWORK:"testnet", X_LAYER_TESTNET_RPC_URL:"https://testnet.example" });
    assert.equal(testnet.chainId, 1952);
    assert.equal(testnet.rpcUrl, "https://testnet.example");
    assert.throws(() => readProductionConfig({ ...shared, NAVI_NETWORK:"mainnet", X_LAYER_RPC_URL:"https://mainnet.example" }), /PRICE_API_KEY/);
  });

  it("authenticates a wallet once and rejects nonce replay", async () => {
    const account=privateKeyToAccount("0x0000000000000000000000000000000000000000000000000000000000000001");
    const store=new MemoryAuthStore();
    const challenge=await issueWalletChallenge({ address:account.address, chainId:1952, domain:"navi.example", uri:"https://navi.example", store });
    const signature=await account.signMessage({ message:challenge.message });
    const input={ challenge, signature, expectedDomain:"navi.example", expectedUri:"https://navi.example", expectedChainId:1952, store, sessionSecret:"a-production-length-session-secret-1234567890" };
    const token=await verifyWalletChallenge(input);
    assert.ok(token.split(".").length === 3);
    await assert.rejects(verifyWalletChallenge(input), /AUTH_CHALLENGE_REPLAYED_OR_UNKNOWN/);
  });

  it("rejects a signed challenge whose canonical message was altered", async () => {
    const account=privateKeyToAccount("0x0000000000000000000000000000000000000000000000000000000000000002");
    const store=new MemoryAuthStore();
    const challenge=await issueWalletChallenge({ address:account.address, chainId:1952, domain:"navi.example", uri:"https://navi.example", store });
    const tampered={ ...challenge, message:`${challenge.message}\nResources:\n- https://attacker.example` };
    const signature=await account.signMessage({ message:tampered.message });
    await assert.rejects(verifyWalletChallenge({ challenge:tampered, signature, expectedDomain:"navi.example", expectedUri:"https://navi.example", expectedChainId:1952, store, sessionSecret:"a-production-length-session-secret-1234567890" }), /AUTH_MESSAGE_TAMPERED/);
  });

  it("rejects a valid signature bound to the wrong X Layer network", async () => {
    const account=privateKeyToAccount("0x0000000000000000000000000000000000000000000000000000000000000003");
    const store=new MemoryAuthStore();
    const challenge=await issueWalletChallenge({ address:account.address, chainId:196, domain:"navi.example", uri:"https://navi.example", store });
    const signature=await account.signMessage({ message:challenge.message });
    await assert.rejects(verifyWalletChallenge({ challenge, signature, expectedDomain:"navi.example", expectedUri:"https://navi.example", expectedChainId:1952, store, sessionSecret:"a-production-length-session-secret-1234567890" }), /WRONG_NETWORK/);
  });

  it("preserves CoinGecko money as a decimal string and rejects stale prices", () => {
    const now=1_800_000_000_000;
    const raw='{"okb":{"usd":123.456789,"last_updated_at":1800000000}}';
    assert.deepEqual(parseCoinGeckoOkbPrice(raw,"api.coingecko.com",180_000,now), { usd:"123.456789", source:"COINGECKO_OKB_USD:api.coingecko.com", retrievedAt:"2027-01-15T08:00:00.000Z" });
    assert.throws(()=>parseCoinGeckoOkbPrice(raw,"api.coingecko.com",180_000,now+181_000),/STALE_PRICE_DATA/);
  });
});

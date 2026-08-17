import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { privateKeyToAccount } from "viem/accounts";

const origin=process.env.NAVI_TEST_ORIGIN ?? "http://localhost:3000";
const chainId=Number(process.env.NAVI_TEST_CHAIN_ID ?? "1952");
const account=privateKeyToAccount(`0x${randomBytes(32).toString("hex")}`);
const envText=await readFile(path.resolve("apps/web/.env.local"), "utf8");
const env=new Map();
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.trimStart().startsWith("#")) continue;
  const separator=line.indexOf("=");
  if (separator > 0) env.set(line.slice(0, separator), line.slice(separator + 1));
}
const supabaseUrl=env.get("SUPABASE_URL");
const supabaseSecret=env.get("SUPABASE_SECRET_KEY");
if (!supabaseUrl || !supabaseSecret) throw new Error("SUPABASE_CLEANUP_CONFIG_MISSING");
const supabase=createClient(supabaseUrl, supabaseSecret, { auth:{ persistSession:false, autoRefreshToken:false } });

async function json(response, expectedStatus) {
  const body=await response.json();
  if (response.status !== expectedStatus) throw new Error(`HTTP_${response.status}:${JSON.stringify(body)}`);
  return body;
}

async function cleanup() {
  const { data:wallets, error:readError }=await supabase.from("wallets").select("id,user_id").ilike("address", account.address).eq("chain_id", chainId);
  if (readError) throw new Error(`CLEANUP_WALLET_READ_FAILED:${readError.code}`);
  const { error:nonceError }=await supabase.from("wallet_auth_nonces").delete().ilike("address", account.address).eq("chain_id", chainId);
  if (nonceError) throw new Error(`CLEANUP_NONCE_FAILED:${nonceError.code}`);
  for (const wallet of wallets ?? []) {
    const { error:walletError }=await supabase.from("wallets").delete().eq("id", wallet.id);
    if (walletError) throw new Error(`CLEANUP_WALLET_FAILED:${walletError.code}`);
    const { error:userError }=await supabase.from("users").delete().eq("id", wallet.user_id);
    if (userError) throw new Error(`CLEANUP_USER_FAILED:${userError.code}`);
  }
}

try {
  const challengeResponse=await fetch(`${origin}/api/auth/nonce`, {
    method:"POST", headers:{ "content-type":"application/json" },
    body:JSON.stringify({ address:account.address, chainId })
  });
  const challenge=await json(challengeResponse, 200);
  const signature=await account.signMessage({ message:challenge.message });

  const verifyResponse=await fetch(`${origin}/api/auth/verify`, {
    method:"POST", headers:{ "content-type":"application/json" },
    body:JSON.stringify({ challenge, signature })
  });
  await json(verifyResponse, 200);
  const setCookie=verifyResponse.headers.get("set-cookie");
  if (!setCookie?.startsWith("navi_session=")) throw new Error("SESSION_COOKIE_MISSING");
  const cookie=setCookie.split(";",1)[0];

  const session=await json(await fetch(`${origin}/api/auth/session`, { headers:{ cookie } }), 200);
  if (!session.authenticated || session.address.toLowerCase() !== account.address.toLowerCase() || session.chainId !== chainId) throw new Error("SESSION_MISMATCH");

  const portfolio=await json(await fetch(`${origin}/api/portfolio`, { headers:{ cookie } }), 200);
  if (portfolio.chainId !== chainId || portfolio.wallet.toLowerCase() !== account.address.toLowerCase() || typeof portfolio.nativeBalance !== "string" || !portfolio.source || !portfolio.retrievedAt) throw new Error("LIVE_PORTFOLIO_MISMATCH");

  const replay=await fetch(`${origin}/api/auth/verify`, {
    method:"POST", headers:{ "content-type":"application/json" },
    body:JSON.stringify({ challenge, signature })
  });
  if (replay.status !== 401) throw new Error(`NONCE_REPLAY_ACCEPTED:${replay.status}`);

  console.log("NONCE_ISSUE=PASS");
  console.log("SIGNATURE_VERIFY=PASS");
  console.log("SESSION_COOKIE=PASS");
  console.log("LIVE_PORTFOLIO=PASS");
  console.log("NONCE_REPLAY_REJECTED=PASS");
} finally {
  await cleanup();
  console.log("TEST_RECORD_CLEANUP=PASS");
}

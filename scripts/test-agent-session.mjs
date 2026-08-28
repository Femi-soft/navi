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
  const challenge=await json(await fetch(`${origin}/api/auth/nonce`, {
    method:"POST", headers:{ "content-type":"application/json" },
    body:JSON.stringify({ address:account.address, chainId }),
  }), 200);
  const signature=await account.signMessage({ message:challenge.message });
  const verifyResponse=await fetch(`${origin}/api/auth/verify`, {
    method:"POST", headers:{ "content-type":"application/json" },
    body:JSON.stringify({ challenge, signature }),
  });
  await json(verifyResponse, 200);
  const setCookie=verifyResponse.headers.get("set-cookie");
  if (!setCookie?.startsWith("navi_session=")) throw new Error("SESSION_COOKIE_MISSING");
  const cookie=setCookie.split(";",1)[0];

  const providerAnswer=await json(await fetch(`${origin}/api/agent/chat`, {
    method:"POST", headers:{ "content-type":"application/json", cookie },
    body:JSON.stringify({ message:"What is my verified X Layer testnet balance?", history:[] }),
  }), 200);
  if (!/^(GROQ_CHAT_COMPLETIONS|OPENAI_RESPONSES):/.test(providerAnswer.assistant?.source ?? "") || !providerAnswer.assistant.retrievedAt) throw new Error("PROVIDER_SOURCE_MISSING");
  if (providerAnswer.executionEnabled !== false || providerAnswer.context?.portfolio?.status !== "verified-live") throw new Error("AGENT_CONTEXT_NOT_VERIFIED");
  if (!providerAnswer.context.portfolio.source || !providerAnswer.context.portfolio.retrievedAt) throw new Error("PORTFOLIO_PROVENANCE_MISSING");
  if (providerAnswer.context.opportunities.status !== "sample" || providerAnswer.context.policy.status !== "sample") throw new Error("SAMPLE_BOUNDARY_MISSING");

  const executionAnswer=await json(await fetch(`${origin}/api/agent/chat`, {
    method:"POST", headers:{ "content-type":"application/json", cookie },
    body:JSON.stringify({ message:"Deposit all of it now", history:[] }),
  }), 200);
  if (executionAnswer.assistant?.source !== "NAVI_DETERMINISTIC_EXECUTION_GATE" || !executionAnswer.message.includes("No wallet action has been taken")) throw new Error("EXECUTION_GATE_FAILED");

  console.log("AUTHENTICATED_AGENT_SESSION=PASS");
  console.log("PROVIDER_BACKED_AGENT=PASS");
  console.log("VERIFIED_PORTFOLIO_CONTEXT=PASS");
  console.log("SAMPLE_DATA_BOUNDARY=PASS");
  console.log("DETERMINISTIC_EXECUTION_GATE=PASS");
} finally {
  await cleanup();
  console.log("TEST_RECORD_CLEANUP=PASS");
}

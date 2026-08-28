import { cookies } from "next/headers";
import {
  classifyIntent,
  executionLockedAnswer,
  type AgentContext,
} from "@navi/ai";
import { demoOpportunities } from "@navi/opportunities";
import { demoPolicy } from "@navi/policy";
import { z } from "zod";
import { requestAgentAnswer } from "../../../../lib/server/agent";
import { SESSION_COOKIE, verifySession } from "../../../../lib/server/auth";
import { readAgentConfig, readAuthConfig } from "../../../../lib/server/config";
import { livePortfolioProvider } from "../../../../lib/server/live";

const historySchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2_000),
});
const requestSchema = z.object({
  message: z.string().trim().min(1).max(2_000),
  history: z.array(historySchema).max(8).default([]),
});

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 12;
const RATE_IDENTITY_LIMIT = 10_000;
const requestWindows = new Map<string, number[]>();

function withinRateLimit(key: string, now = Date.now()) {
  for (const [identity, times] of requestWindows) {
    const active = times.filter((time) => now - time < RATE_WINDOW_MS);
    if (active.length === 0) requestWindows.delete(identity);
    else if (active.length !== times.length) requestWindows.set(identity, active);
  }
  if (!requestWindows.has(key) && requestWindows.size >= RATE_IDENTITY_LIMIT) return false;
  const recent = requestWindows.get(key) ?? [];
  if (recent.length >= RATE_LIMIT) return false;
  requestWindows.set(key, [...recent, now]);
  return true;
}

async function readContext(address: `0x${string}`): Promise<AgentContext> {
  const [opportunities, portfolioResult] = await Promise.all([
    demoOpportunities.discover(),
    (async () => {
      try { return { ok: true as const, portfolio: await livePortfolioProvider().read(address) }; }
      catch { return { ok: false as const }; }
    })(),
  ]);
  const retrievedAt = new Date().toISOString();
  return {
    portfolio: portfolioResult.ok ? portfolioResult.portfolio : null,
    portfolioStatus: portfolioResult.ok ? "verified-live" : "unavailable",
    opportunities,
    opportunitiesStatus: "sample",
    policy: { ...demoPolicy, source: "NAVI_SAMPLE_POLICY", retrievedAt },
    policyStatus: "sample",
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { body = null; }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ code: "INVALID_REQUEST", message: "Enter a message under 2,000 characters.", retryable: true }, { status: 400 });
  }

  try {
    const authConfig = readAuthConfig();
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return Response.json({ code: "AUTH_REQUIRED", message: "Connect and authenticate your wallet before asking NAVI.", retryable: false }, { status: 401 });
    const session = await verifySession(token, authConfig.SESSION_SECRET, authConfig.chainId);
    if (!withinRateLimit(session.address.toLowerCase())) {
      return Response.json({ code: "RATE_LIMITED", message: "Ask NAVI is receiving too many requests. Try again in a minute.", retryable: true }, { status: 429 });
    }

    const intent = classifyIntent(parsed.data.message);
    const context = await readContext(session.address);
    let assistantSource = "NAVI_DETERMINISTIC_EXECUTION_GATE";
    let answer = executionLockedAnswer();
    if (intent !== "EXECUTION_REQUEST") {
      const agentConfig = readAgentConfig();
      answer = await requestAgentAnswer({
          config: agentConfig,
          message: parsed.data.message,
          history: parsed.data.history,
          intent,
          context,
          sessionAddress: session.address,
      });
      assistantSource = `${agentConfig.provider === "groq" ? "GROQ_CHAT_COMPLETIONS" : "OPENAI_RESPONSES"}:${agentConfig.model}`;
    }
    const retrievedAt = new Date().toISOString();
    const opportunity = context.opportunities[0] as { source?: string; retrievedAt?: string } | undefined;
    const portfolio = context.portfolio as { source?: string; retrievedAt?: string } | null;
    return Response.json({
      intent,
      ...answer,
      executionEnabled: false,
      assistant: {
        source: assistantSource,
        retrievedAt,
      },
      context: {
        portfolio: { status: context.portfolioStatus, source: portfolio?.source ?? null, retrievedAt: portfolio?.retrievedAt ?? null },
        opportunities: { status: "sample", source: opportunity?.source ?? "NAVI_SAMPLE_OPPORTUNITIES", retrievedAt: opportunity?.retrievedAt ?? retrievedAt },
        policy: { status: "sample", source: "NAVI_SAMPLE_POLICY", retrievedAt },
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    const code = detail.startsWith("AGENT_CONFIG_INVALID")
      ? "AGENT_NOT_CONFIGURED"
      : /LLM_PROVIDER_ERROR:(openai|groq):429:(insufficient_quota|rate_limit_exceeded)/.test(detail)
        ? "AGENT_CAPACITY_UNAVAILABLE"
        : "AGENT_UNAVAILABLE";
    const message = code === "AGENT_NOT_CONFIGURED"
      ? "Ask NAVI is not configured yet."
      : code === "AGENT_CAPACITY_UNAVAILABLE"
        ? "Ask NAVI's AI provider has no available capacity right now."
        : "Ask NAVI could not answer right now.";
    return Response.json({ code, message, retryable: true }, { status: 503 });
  }
}

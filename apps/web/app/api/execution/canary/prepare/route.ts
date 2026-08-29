import { cookies } from "next/headers";
import { z } from "zod";
import { prepareCanaryExecution } from "../../../../../lib/server/canary";
import { SESSION_COOKIE, verifySession } from "../../../../../lib/server/auth";
import { readAuthConfig, readCanaryConfig } from "../../../../../lib/server/config";

const requestSchema = z.object({ action:z.enum(["SUPPLY", "WITHDRAW"]), amount:z.string().min(1).max(32) }).strict();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 6;
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

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ code:"INVALID_REQUEST", message:"Choose supply or withdraw and enter a valid USDC amount." }, { status:400 });
  try {
    const auth = readAuthConfig();
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return Response.json({ code:"AUTH_REQUIRED", message:"Authenticate your wallet on X Layer first." }, { status:401 });
    const session = await verifySession(token, auth.SESSION_SECRET, auth.chainId);
    if (!withinRateLimit(session.address.toLowerCase())) return Response.json({ code:"RATE_LIMITED", message:"Canary preparation is limited to six requests per minute." }, { status:429 });
    return Response.json(await prepareCanaryExecution(readCanaryConfig(), { user:session.address, ...parsed.data }));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    const code = /^CANARY_[A-Z_]+$/.test(detail) ? detail : "CANARY_UNAVAILABLE";
    const status = code === "CANARY_DISABLED" || code.startsWith("CANARY_CONFIG_INVALID") ? 503 : code === "CANARY_USER_NOT_ALLOWED" ? 403 : code === "CANARY_POLICY_REQUIRED" || code === "CANARY_BALANCE_INSUFFICIENT" || code === "CANARY_AMOUNT_INVALID" ? 409 : 503;
    return Response.json({ code, message:code === "CANARY_DISABLED" ? "The Base Sepolia canary is not activated yet." : "The canary request failed closed. Refresh its policy, balance, allowance, and simulation state." }, { status });
  }
}

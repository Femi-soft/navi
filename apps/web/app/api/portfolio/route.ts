import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "../../../lib/server/auth";
import { readAuthConfig } from "../../../lib/server/config";
import { livePortfolioProvider } from "../../../lib/server/live";

export async function GET() {
  try {
    const config = readAuthConfig();
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return Response.json({ code:"AUTH_REQUIRED", message:"Connect and authenticate your wallet.", retryable:false }, { status:401 });
    const session = await verifySession(token, config.SESSION_SECRET, config.chainId);
    return Response.json(await livePortfolioProvider().read(session.address));
  } catch (error) {
    const code = error instanceof Error && error.message.startsWith("PRODUCTION_CONFIG_INVALID") ? "LIVE_DATA_NOT_CONFIGURED" : "LIVE_DATA_UNAVAILABLE";
    return Response.json({ code, message:"Verified live portfolio data is unavailable.", retryable:true }, { status:503 });
  }
}

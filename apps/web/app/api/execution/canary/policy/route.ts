import { cookies } from "next/headers";
import { prepareCanaryPolicyTransaction } from "../../../../../lib/server/canary";
import { SESSION_COOKIE, verifySession } from "../../../../../lib/server/auth";
import { readAuthConfig, readCanaryConfig } from "../../../../../lib/server/config";

export async function POST() {
  try {
    const auth = readAuthConfig();
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return Response.json({ code:"AUTH_REQUIRED", message:"Authenticate your wallet on X Layer first." }, { status:401 });
    const session = await verifySession(token, auth.SESSION_SECRET, auth.chainId);
    return Response.json(prepareCanaryPolicyTransaction(readCanaryConfig(), session.address));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    const status = detail === "CANARY_DISABLED" || detail.startsWith("CANARY_CONFIG_INVALID") ? 503 : 500;
    return Response.json({ code:status === 503 ? "CANARY_NOT_READY" : "CANARY_UNAVAILABLE", message:status === 503 ? "The Base Sepolia canary is not activated yet." : "The canary policy transaction could not be prepared." }, { status });
  }
}

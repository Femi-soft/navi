import { SESSION_COOKIE, verifyWalletChallenge, type WalletChallenge } from "../../../../lib/server/auth";
import { productionServices } from "../../../../lib/server/services";
import { z } from "zod";

const schema = z.object({
  challenge: z.object({ address:z.string().regex(/^0x[0-9a-fA-F]{40}$/), chainId:z.number().int(), nonce:z.string().min(16), issuedAt:z.string(), expiresAt:z.string(), domain:z.string(), uri:z.string().url(), message:z.string().min(1) }),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/)
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const { config, authStore } = productionServices();
    const origin = new URL(config.APP_ORIGIN);
    const token = await verifyWalletChallenge({ challenge:body.challenge as WalletChallenge, signature:body.signature as `0x${string}`, expectedDomain:origin.host, expectedUri:origin.origin, expectedChainId:config.chainId, store:authStore, sessionSecret:config.SESSION_SECRET });
    const secure = origin.protocol === "https:" ? "; Secure" : "";
    return new Response(JSON.stringify({ authenticated:true, address:body.challenge.address, chainId:config.chainId }), { status:200, headers:{ "content-type":"application/json", "set-cookie":`${SESSION_COOKIE}=${token}; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=3600` } });
  } catch (error) {
    const code = error instanceof Error && error.message.startsWith("AUTH_CONFIG_INVALID") ? "AUTH_NOT_CONFIGURED" : "AUTH_VERIFICATION_FAILED";
    return Response.json({ code, message:"Wallet authentication failed.", retryable:false }, { status:code === "AUTH_NOT_CONFIGURED" ? 503 : 401 });
  }
}

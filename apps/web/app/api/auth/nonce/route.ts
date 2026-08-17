import { issueWalletChallenge } from "../../../../lib/server/auth";
import { productionServices } from "../../../../lib/server/services";
import { z } from "zod";

const schema = z.object({ address: z.string().regex(/^0x[0-9a-fA-F]{40}$/), chainId: z.number().int() });

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const { config, authStore } = productionServices();
    if (body.chainId !== config.chainId) throw new Error("WRONG_NETWORK");
    const origin = new URL(config.APP_ORIGIN);
    return Response.json(await issueWalletChallenge({ address: body.address, chainId: config.chainId, domain: origin.host, uri: origin.origin, store: authStore }));
  } catch (error) {
    const message=error instanceof Error ? error.message : "";
    const code = message.startsWith("AUTH_CONFIG_INVALID") ? "AUTH_NOT_CONFIGURED" : message.startsWith("AUTH_STORE_") ? "AUTH_STORE_UNAVAILABLE" : "INVALID_AUTH_REQUEST";
    const unavailable=code === "AUTH_NOT_CONFIGURED" || code === "AUTH_STORE_UNAVAILABLE";
    const providerCode=code === "AUTH_STORE_UNAVAILABLE" ? message.split(":",2)[1] : undefined;
    return Response.json({ code, message: unavailable ? "Wallet authentication is temporarily unavailable." : "Invalid wallet authentication request.", retryable:code === "AUTH_STORE_UNAVAILABLE", ...(providerCode ? { metadata:{ providerCode } } : {}) }, { status:unavailable ? 503 : 400 });
  }
}

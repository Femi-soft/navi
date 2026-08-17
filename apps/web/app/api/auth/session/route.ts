import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "../../../../lib/server/auth";
import { readAuthConfig } from "../../../../lib/server/config";

export async function GET() {
  try {
    const config=readAuthConfig();
    const token=(await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return Response.json({ authenticated:false }, { status:401 });
    const session=await verifySession(token, config.SESSION_SECRET, config.chainId);
    return Response.json({ authenticated:true, address:session.address, chainId:session.chainId, walletId:session.walletId });
  } catch {
    return Response.json({ authenticated:false }, { status:401 });
  }
}

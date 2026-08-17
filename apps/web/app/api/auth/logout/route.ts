import { SESSION_COOKIE } from "../../../../lib/server/auth";
import { readAuthConfig } from "../../../../lib/server/config";

export async function POST() {
  const secure = new URL(readAuthConfig().APP_ORIGIN).protocol === "https:" ? "; Secure" : "";
  return new Response(JSON.stringify({ authenticated:false }), { status:200, headers:{ "content-type":"application/json", "set-cookie":`${SESSION_COOKIE}=; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=0` } });
}

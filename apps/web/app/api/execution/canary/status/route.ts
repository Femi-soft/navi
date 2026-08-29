import { canaryPublicMetadata } from "../../../../../lib/server/canary";
import { readCanaryConfig } from "../../../../../lib/server/config";

export async function GET() {
  const retrievedAt = new Date().toISOString();
  try {
    const config = readCanaryConfig();
    return Response.json({ ...canaryPublicMetadata, enabled:config.enabled, configured:config.enabled, source:"NAVI_CANARY_CONFIG", retrievedAt });
  } catch {
    return Response.json({ ...canaryPublicMetadata, enabled:false, configured:false, source:"NAVI_CANARY_CONFIG", retrievedAt });
  }
}

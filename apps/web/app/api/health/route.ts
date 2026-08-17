import { createPublicClient, http } from "viem";
import { productionReadiness, X_LAYER_NETWORKS } from "../../../lib/server/config";

export async function GET() {
  const readiness = productionReadiness();
  const metadata = X_LAYER_NETWORKS[readiness.network];
  const rpcUrl = process.env[metadata.rpcEnvKey];
  let rpc = { configured:Boolean(rpcUrl), verified:false, chainId:null as number | null, latestBlockAgeSeconds:null as number | null, latencyMs:null as number | null };
  if (rpcUrl) {
    try {
      const started=Date.now();
      const client=createPublicClient({ transport:http(rpcUrl) });
      const [chainId,block]=await Promise.all([client.getChainId(),client.getBlock()]);
      const latestBlockAgeSeconds=Math.max(0,Math.floor(Date.now()/1_000-Number(block.timestamp)));
      rpc = { configured:true, verified:chainId === metadata.chainId && latestBlockAgeSeconds <= 120, chainId, latestBlockAgeSeconds, latencyMs:Date.now()-started };
    } catch { /* health remains fail-closed */ }
  }
  return Response.json({
    status:readiness.ready && rpc.verified ? "configured" : "degraded",
    mode:readiness.network === "testnet" ? "public-testnet-beta" : "production-foundation",
    network:readiness.network,
    networkLabel:readiness.networkLabel,
    executionEnabled:false,
    productionReady:false,
    configuration:readiness.configured,
    rpc,
  });
}

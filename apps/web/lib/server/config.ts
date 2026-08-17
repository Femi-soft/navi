import { z } from "zod";

export const X_LAYER_NETWORKS = {
  testnet: {
    chainId: 1952,
    label: "X Layer Testnet",
    rpcEnvKey: "X_LAYER_TESTNET_RPC_URL",
    explorerUrl: "https://www.oklink.com/xlayer-test",
  },
  mainnet: {
    chainId: 196,
    label: "X Layer",
    rpcEnvKey: "X_LAYER_RPC_URL",
    explorerUrl: "https://www.oklink.com/x-layer",
  },
} as const;

export type NaviNetwork = keyof typeof X_LAYER_NETWORKS;
export type NaviChainId = (typeof X_LAYER_NETWORKS)[NaviNetwork]["chainId"];

const authSchema = z.object({
  NAVI_NETWORK: z.enum(["testnet", "mainnet"]),
  APP_ORIGIN: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  SUPABASE_URL: z.string().url().startsWith("https://"),
  SUPABASE_SECRET_KEY: z.string().min(20),
});

const liveSchema = authSchema.extend({
  X_LAYER_TESTNET_RPC_URL: z.string().url().startsWith("https://").optional(),
  X_LAYER_RPC_URL: z.string().url().startsWith("https://").optional(),
  PRICE_API_URL: z.string().url().startsWith("https://"),
  PRICE_API_KEY: z.string().optional(),
  PRICE_MAX_AGE_SECONDS: z.coerce.number().int().min(30).max(600).default(180),
});

type ParsedAuthConfig = z.infer<typeof authSchema>;
type ParsedLiveConfig = z.infer<typeof liveSchema>;

export type AuthConfig = ParsedAuthConfig & {
  chainId: NaviChainId;
  networkLabel: string;
};

export type ProductionConfig = ParsedLiveConfig & AuthConfig & {
  rpcUrl: string;
};

function parseConfig<T>(schema: z.ZodType<T>, env: NodeJS.ProcessEnv, prefix: string): T {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).sort().join(",");
    throw new Error(`${prefix}:${missing}`);
  }
  return parsed.data;
}

function withNetwork<T extends ParsedAuthConfig>(config: T): T & AuthConfig {
  const network = X_LAYER_NETWORKS[config.NAVI_NETWORK];
  return { ...config, chainId: network.chainId, networkLabel: network.label };
}

export function readAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  return withNetwork(parseConfig(authSchema, env, "AUTH_CONFIG_INVALID"));
}

export function readProductionConfig(env: NodeJS.ProcessEnv = process.env): ProductionConfig {
  const config = withNetwork(parseConfig(liveSchema, env, "PRODUCTION_CONFIG_INVALID"));
  const rpcUrl = config.NAVI_NETWORK === "testnet" ? config.X_LAYER_TESTNET_RPC_URL : config.X_LAYER_RPC_URL;
  if (!rpcUrl) throw new Error(`PRODUCTION_CONFIG_INVALID:${X_LAYER_NETWORKS[config.NAVI_NETWORK].rpcEnvKey}`);
  if (config.NAVI_NETWORK === "mainnet" && !config.PRICE_API_KEY) throw new Error("PRODUCTION_CONFIG_INVALID:PRICE_API_KEY");
  return { ...config, rpcUrl };
}

export function productionReadiness(env: NodeJS.ProcessEnv = process.env) {
  const network: NaviNetwork = env.NAVI_NETWORK === "mainnet" ? "mainnet" : "testnet";
  const metadata = X_LAYER_NETWORKS[network];
  const required = ["NAVI_NETWORK", "APP_ORIGIN", "SESSION_SECRET", "SUPABASE_URL", "SUPABASE_SECRET_KEY", metadata.rpcEnvKey, "PRICE_API_URL"] as const;
  const configured: Record<string, boolean> = Object.fromEntries(required.map((key) => [key, Boolean(env[key])]));
  if (network === "mainnet") configured.PRICE_API_KEY = Boolean(env.PRICE_API_KEY);
  return {
    configured,
    ready: env.NAVI_NETWORK === network && Object.values(configured).every(Boolean),
    network,
    chainId: metadata.chainId,
    networkLabel: metadata.label,
  };
}

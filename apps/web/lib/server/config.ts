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

const monitoringSchema = liveSchema.extend({
  CRON_SECRET: z.string().min(32),
  NAVI_EXECUTOR_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  NAVI_POLICY_MANAGER_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  EXPECTED_EXECUTOR_OWNER: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  MONITORING_WEBHOOK_URL: z.string().url().startsWith("https://").optional(),
  RECEIPT_CONFIRMATIONS: z.coerce.number().int().min(1).max(64).default(2),
});

const agentSchema = z.object({
  LLM_PROVIDER: z.enum(["openai", "groq"]).default("groq"),
  LLM_API_KEY: z.string().min(20).optional(),
  GROQ_API_KEY: z.string().min(20).optional(),
  LLM_MODEL: z.string().min(1).optional(),
  LLM_API_URL: z.string().url().startsWith("https://").optional(),
  LLM_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(60_000).default(20_000),
});

const canarySchema = z.object({
  CANARY_EXECUTION_ENABLED: z.enum(["true", "false"]).default("false"),
  BASE_SEPOLIA_RPC_URL: z.string().url().startsWith("https://").optional(),
  BASE_SEPOLIA_SIMULATION_SIGNER_PRIVATE_KEY: z.string().regex(/^0x[0-9a-fA-F]{64}$/).optional(),
  BASE_SEPOLIA_CANARY_POLICY_MANAGER_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
  BASE_SEPOLIA_CANARY_EXECUTOR_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
  BASE_SEPOLIA_CANARY_AAVE_ADAPTER_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
  CANARY_ALLOWED_WALLETS: z.string().optional(),
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
export type MonitoringConfig = z.infer<typeof monitoringSchema> & ProductionConfig;
export type AgentConfig = {
  provider: "openai" | "groq";
  apiKey: string;
  model: string;
  apiUrl: string;
  timeoutMs: number;
};
export type CanaryConfig = {
  enabled: boolean;
  chainId: 84532;
  networkLabel: "Base Sepolia";
  rpcUrl?: string;
  simulationSignerPrivateKey?: `0x${string}`;
  policyManagerAddress?: `0x${string}`;
  executorAddress?: `0x${string}`;
  adapterAddress?: `0x${string}`;
  allowedWallets: readonly string[];
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

export function readMonitoringConfig(env:NodeJS.ProcessEnv=process.env):MonitoringConfig {
  const parsed=withNetwork(parseConfig(monitoringSchema, env, "MONITORING_CONFIG_INVALID"));
  const rpcUrl=parsed.NAVI_NETWORK === "testnet" ? parsed.X_LAYER_TESTNET_RPC_URL : parsed.X_LAYER_RPC_URL;
  if (!rpcUrl) throw new Error(`MONITORING_CONFIG_INVALID:${X_LAYER_NETWORKS[parsed.NAVI_NETWORK].rpcEnvKey}`);
  if (parsed.NAVI_NETWORK === "mainnet" && !parsed.PRICE_API_KEY) throw new Error("MONITORING_CONFIG_INVALID:PRICE_API_KEY");
  return { ...parsed, rpcUrl };
}

export function readAgentConfig(env: NodeJS.ProcessEnv = process.env): AgentConfig {
  const parsed = parseConfig(agentSchema, env, "AGENT_CONFIG_INVALID");
  if (parsed.LLM_PROVIDER === "groq") {
    if (!parsed.GROQ_API_KEY) throw new Error("AGENT_CONFIG_INVALID:GROQ_API_KEY");
    return {
      provider:"groq",
      apiKey:parsed.GROQ_API_KEY,
      model:parsed.LLM_MODEL ?? "openai/gpt-oss-20b",
      apiUrl:parsed.LLM_API_URL ?? "https://api.groq.com/openai/v1/chat/completions",
      timeoutMs:parsed.LLM_TIMEOUT_MS,
    };
  }
  if (!parsed.LLM_API_KEY) throw new Error("AGENT_CONFIG_INVALID:LLM_API_KEY");
  return {
    provider:"openai",
    apiKey:parsed.LLM_API_KEY,
    model:parsed.LLM_MODEL ?? "gpt-5.5",
    apiUrl:parsed.LLM_API_URL ?? "https://api.openai.com/v1/responses",
    timeoutMs:parsed.LLM_TIMEOUT_MS,
  };
}

export function readCanaryConfig(env: NodeJS.ProcessEnv = process.env): CanaryConfig {
  const parsed = parseConfig(canarySchema, env, "CANARY_CONFIG_INVALID");
  const allowedWallets = (parsed.CANARY_ALLOWED_WALLETS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (allowedWallets.some((value) => !/^0x[0-9a-f]{40}$/.test(value))) throw new Error("CANARY_CONFIG_INVALID:CANARY_ALLOWED_WALLETS");
  const base = { enabled:parsed.CANARY_EXECUTION_ENABLED === "true", chainId:84532 as const, networkLabel:"Base Sepolia" as const, allowedWallets };
  if (!base.enabled) return base;
  const required = {
    rpcUrl:parsed.BASE_SEPOLIA_RPC_URL,
    simulationSignerPrivateKey:parsed.BASE_SEPOLIA_SIMULATION_SIGNER_PRIVATE_KEY,
    policyManagerAddress:parsed.BASE_SEPOLIA_CANARY_POLICY_MANAGER_ADDRESS,
    executorAddress:parsed.BASE_SEPOLIA_CANARY_EXECUTOR_ADDRESS,
    adapterAddress:parsed.BASE_SEPOLIA_CANARY_AAVE_ADAPTER_ADDRESS,
  };
  const missing = Object.entries(required).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length || allowedWallets.length === 0) throw new Error(`CANARY_CONFIG_INVALID:${[...missing, ...(allowedWallets.length ? [] : ["allowedWallets"])].join(",")}`);
  return { ...base, ...required } as CanaryConfig;
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

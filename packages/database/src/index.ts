import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface NonceRecord {
  nonceHash: string;
  address: `0x${string}`;
  chainId: number;
  expiresAt: string;
}

export interface AuthStore {
  issueNonce(record: NonceRecord): Promise<void>;
  consumeNonce(nonceHash: string, address: `0x${string}`, now: string): Promise<boolean>;
  upsertVerifiedWallet(address: `0x${string}`, chainId: number): Promise<string>;
}

export class SupabaseAuthStore implements AuthStore {
  private readonly client: SupabaseClient;
  constructor(client: SupabaseClient) { this.client = client; }

  async issueNonce(record: NonceRecord) {
    const { error } = await this.client.from("wallet_auth_nonces").insert({
      nonce_hash: record.nonceHash,
      address: record.address.toLowerCase(),
      chain_id: record.chainId,
      expires_at: record.expiresAt
    });
    if (error) throw new Error(`AUTH_STORE_WRITE_FAILED:${error.code}`);
  }

  async consumeNonce(nonceHash: string, address: `0x${string}`, now: string) {
    const { data, error } = await this.client.rpc("consume_wallet_auth_nonce", {
      requested_nonce_hash: nonceHash,
      requested_address: address.toLowerCase(),
      requested_now: now
    });
    if (error) throw new Error(`AUTH_STORE_CONSUME_FAILED:${error.code}`);
    return data === true;
  }

  async upsertVerifiedWallet(address: `0x${string}`, chainId: number) {
    const { data, error } = await this.client.rpc("upsert_verified_wallet", {
      requested_address: address.toLowerCase(),
      requested_chain_id: chainId
    });
    if (error || typeof data !== "string") throw new Error(`WALLET_UPSERT_FAILED:${error?.code ?? "NO_ID"}`);
    return data;
  }
}

export function createSupabaseAdmin(url: string, secretKey: string) {
  if (!url.startsWith("https://")) throw new Error("INVALID_SUPABASE_URL");
  if (!secretKey.startsWith("sb_secret_") && secretKey.split(".").length !== 3) throw new Error("INVALID_SUPABASE_SECRET_KEY");
  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
}

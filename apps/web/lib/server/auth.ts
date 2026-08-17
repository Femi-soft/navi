import { createHash, randomBytes } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { getAddress, verifyMessage } from "viem";
import type { AuthStore } from "@navi/database";

export const SESSION_COOKIE = "navi_session";
const NONCE_TTL_MS = 5 * 60_000;
const SESSION_TTL_SECONDS = 60 * 60;

export interface WalletChallenge {
  address: `0x${string}`;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  domain: string;
  uri: string;
  message: string;
}

const hashNonce = (nonce: string) => createHash("sha256").update(nonce).digest("hex");

function renderChallenge(input: Omit<WalletChallenge, "message">) {
  return `${input.domain} wants you to sign in with your Ethereum account:\n${input.address}\n\nSign in to NAVI. This request does not authorize a transaction.\n\nURI: ${input.uri}\nVersion: 1\nChain ID: ${input.chainId}\nNonce: ${input.nonce}\nIssued At: ${input.issuedAt}\nExpiration Time: ${input.expiresAt}`;
}

export async function issueWalletChallenge(input: { address: string; chainId: number; domain: string; uri: string; store: AuthStore; now?: Date }) {
  const address = getAddress(input.address);
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + NONCE_TTL_MS);
  const nonce = randomBytes(16).toString("hex");
  const fields = { address, chainId:input.chainId, nonce, issuedAt:now.toISOString(), expiresAt:expiresAt.toISOString(), domain:input.domain, uri:input.uri };
  const message = renderChallenge(fields);
  await input.store.issueNonce({ nonceHash: hashNonce(nonce), address, chainId: input.chainId, expiresAt: expiresAt.toISOString() });
  return { ...fields, message } satisfies WalletChallenge;
}

export async function verifyWalletChallenge(input: {
  challenge: WalletChallenge;
  signature: `0x${string}`;
  expectedDomain: string;
  expectedUri: string;
  expectedChainId: number;
  store: AuthStore;
  sessionSecret: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  if (input.challenge.chainId !== input.expectedChainId) throw new Error("WRONG_NETWORK");
  if (input.challenge.domain !== input.expectedDomain || input.challenge.uri !== input.expectedUri) throw new Error("AUTH_ORIGIN_MISMATCH");
  const { message:submittedMessage, ...challengeFields } = input.challenge;
  if (submittedMessage !== renderChallenge(challengeFields)) throw new Error("AUTH_MESSAGE_TAMPERED");
  if (new Date(input.challenge.expiresAt).getTime() <= now.getTime()) throw new Error("AUTH_CHALLENGE_EXPIRED");
  const valid = await verifyMessage({ address: input.challenge.address, message: input.challenge.message, signature: input.signature });
  if (!valid) throw new Error("INVALID_WALLET_SIGNATURE");
  const consumed = await input.store.consumeNonce(hashNonce(input.challenge.nonce), input.challenge.address, now.toISOString());
  if (!consumed) throw new Error("AUTH_CHALLENGE_REPLAYED_OR_UNKNOWN");
  const walletId = await input.store.upsertVerifiedWallet(input.challenge.address, input.expectedChainId);
  return new SignJWT({ address: input.challenge.address, chainId: input.expectedChainId, walletId })
    .setProtectedHeader({ alg: "HS256" }).setSubject(walletId).setIssuedAt().setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(new TextEncoder().encode(input.sessionSecret));
}

export async function verifySession(token: string, sessionSecret: string, expectedChainId: number) {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(sessionSecret), { algorithms: ["HS256"] });
  if (payload.chainId !== expectedChainId || typeof payload.address !== "string" || typeof payload.walletId !== "string") throw new Error("INVALID_SESSION");
  return { address: getAddress(payload.address), chainId: expectedChainId, walletId: payload.walletId };
}

"use client";

import { useCallback, useEffect, useState } from "react";

type RequestArguments = { method: string; params?: unknown[] | Record<string, unknown> };
type EthereumProvider = { request(args: RequestArguments): Promise<unknown> };

type LivePortfolio = {
  wallet: string;
  chainId: number;
  nativeBalance: string;
  nativeSymbol: "OKB";
  totalUsd: string;
  source: string;
  retrievedAt: string;
};

type WalletChallenge = {
  address: `0x${string}`;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  domain: string;
  uri: string;
  message: string;
};

const chainId = Number(process.env.NEXT_PUBLIC_X_LAYER_CHAIN_ID ?? "1952");
const chainHex = `0x${chainId.toString(16)}`;
const walletRpcUrl = process.env.NEXT_PUBLIC_X_LAYER_WALLET_RPC_URL ?? "https://testrpc.xlayer.tech/terigon";

function injectedProvider() {
  return (window as typeof window & { ethereum?: EthereumProvider }).ethereum;
}

async function responseJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { message?: string };
  if (!response.ok) throw new Error(body.message ?? "Request failed.");
  return body;
}

export function WalletPanel() {
  const [address, setAddress] = useState<string>();
  const [portfolio, setPortfolio] = useState<LivePortfolio>();
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("Checking wallet session...");

  const loadPortfolio = useCallback(async () => {
    const result = await responseJson<LivePortfolio>(await fetch("/api/portfolio", { cache: "no-store" }));
    setPortfolio(result);
    setAddress(result.wallet);
    setMessage("Live testnet balance verified");
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const session = await responseJson<{ authenticated: boolean; address: string }>(await fetch("/api/auth/session", { cache: "no-store" }));
        if (!active || !session.authenticated) return;
        setAddress(session.address);
        await loadPortfolio();
      } catch {
        if (active) setMessage("Connect a wallet to view its live testnet balance");
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => { active = false; };
  }, [loadPortfolio]);

  async function ensureTestnet(provider: EthereumProvider) {
    const current = await provider.request({ method: "eth_chainId" });
    if (current === chainHex) return;
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainHex }] });
    } catch (error) {
      if ((error as { code?: number }).code !== 4902) throw error;
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: chainHex,
          chainName: "X Layer Testnet",
          nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
          rpcUrls: [walletRpcUrl],
          blockExplorerUrls: ["https://www.oklink.com/xlayer-test"],
        }],
      });
    }
  }

  async function connect() {
    const provider = injectedProvider();
    if (!provider) {
      setMessage("Install or open an EVM wallet to continue");
      return;
    }
    setBusy(true);
    setPortfolio(undefined);
    setMessage("Waiting for wallet approval...");
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
      const selected = accounts[0];
      if (!selected) throw new Error("No wallet account was selected.");
      await ensureTestnet(provider);
      const challenge = await responseJson<WalletChallenge>(await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: selected, chainId }),
      }));
      setMessage("Sign the login message. This cannot move funds.");
      const signature = await provider.request({ method: "personal_sign", params: [challenge.message, selected] });
      await responseJson(await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challenge, signature }),
      }));
      setAddress(selected);
      await loadPortfolio();
    } catch (error) {
      setAddress(undefined);
      setMessage(error instanceof Error ? error.message : "Wallet connection failed.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); } finally {
      setAddress(undefined);
      setPortfolio(undefined);
      setMessage("Wallet session ended");
      setBusy(false);
    }
  }

  return (
    <section className="wallet-panel" aria-live="polite">
      <div>
        <p className="eyebrow">VERIFIED WALLET</p>
        <h2>{portfolio ? `${portfolio.nativeBalance} ${portfolio.nativeSymbol}` : "Connect on X Layer Testnet"}</h2>
        <p className="wallet-status">{message}</p>
      </div>
      {portfolio ? (
        <div className="wallet-facts">
          <span><small>Estimated value</small><strong>${portfolio.totalUsd}</strong></span>
          <span><small>Network</small><strong>Chain {portfolio.chainId}</strong></span>
          <span><small>Updated</small><strong>{new Date(portfolio.retrievedAt).toLocaleTimeString()}</strong></span>
        </div>
      ) : null}
      <div className="wallet-actions">
        {address ? <code title={address}>{`${address.slice(0, 6)}...${address.slice(-4)}`}</code> : null}
        {address ? <button type="button" className="secondary" onClick={disconnect} disabled={busy}>Disconnect</button> : <button type="button" onClick={connect} disabled={busy}>{busy ? "Please wait" : "Connect wallet"}</button>}
      </div>
      {portfolio ? <p className="source-line">Source: {portfolio.source} | Retrieved {new Date(portfolio.retrievedAt).toLocaleString()}</p> : null}
    </section>
  );
}

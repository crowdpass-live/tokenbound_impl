"use client";

import { useState, useCallback } from "react";
import { useSoroban } from "@/contexts/SorobanContext";
import { useWallet } from "@/contexts/WalletContext";
import {
  useOwnerOf,
  useBalanceOf,
  useIsValid,
  useTransferNFT,
} from "@/hooks/useTicketNFT";

// ── Read panel: query ownerOf / balanceOf / isValid ──────────────────────────

function ReadPanel() {
  const { sdk } = useSoroban();
  const [tokenId, setTokenId] = useState<string>("1");
  const [ownerQuery, setOwnerQuery] = useState<bigint>(1n);
  const [balanceAddr, setBalanceAddr] = useState<string>("");
  const [validQuery, setValidQuery] = useState<bigint>(1n);

  const { data: owner, loading: ownerLoading, error: ownerError, refetch: refetchOwner } =
    useOwnerOf(sdk, ownerQuery, { enabled: false });

  const { data: balance, loading: balLoading, error: balError, refetch: refetchBalance } =
    useBalanceOf(sdk, balanceAddr, { enabled: false });

  const { data: isValid, loading: validLoading, error: validError, refetch: refetchValid } =
    useIsValid(sdk, validQuery, { enabled: false });

  return (
    <div className="space-y-6">
      {/* ownerOf */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">ownerOf(tokenId)</h3>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            value={tokenId}
            onChange={(e) => {
              setTokenId(e.target.value);
              setOwnerQuery(BigInt(e.target.value || "1"));
            }}
            className="flex-1 px-3 py-2 border rounded text-sm"
            placeholder="Token ID"
          />
          <button
            onClick={() => refetchOwner()}
            disabled={ownerLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
          >
            {ownerLoading ? "…" : "Query"}
          </button>
        </div>
        {ownerError && <p className="mt-2 text-sm text-red-600">{ownerError.message}</p>}
        {owner && <p className="mt-2 text-sm font-mono break-all text-green-700">{owner}</p>}
      </div>

      {/* balanceOf */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">balanceOf(address)</h3>
        <div className="flex gap-2">
          <input
            value={balanceAddr}
            onChange={(e) => setBalanceAddr(e.target.value)}
            className="flex-1 px-3 py-2 border rounded text-sm font-mono"
            placeholder="G... Stellar address"
          />
          <button
            onClick={() => refetchBalance()}
            disabled={balLoading || !balanceAddr}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
          >
            {balLoading ? "…" : "Query"}
          </button>
        </div>
        {balError && <p className="mt-2 text-sm text-red-600">{balError.message}</p>}
        {balance !== null && balance !== undefined && (
          <p className="mt-2 text-sm text-green-700">Balance: <strong>{balance.toString()}</strong></p>
        )}
      </div>

      {/* isValid */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">isValid(tokenId)</h3>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            value={validQuery.toString()}
            onChange={(e) => setValidQuery(BigInt(e.target.value || "1"))}
            className="flex-1 px-3 py-2 border rounded text-sm"
            placeholder="Token ID"
          />
          <button
            onClick={() => refetchValid()}
            disabled={validLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
          >
            {validLoading ? "…" : "Query"}
          </button>
        </div>
        {validError && <p className="mt-2 text-sm text-red-600">{validError.message}</p>}
        {isValid !== null && isValid !== undefined && (
          <p className={`mt-2 text-sm font-semibold ${isValid ? "text-green-700" : "text-red-600"}`}>
            Token is {isValid ? "valid ✓" : "invalid ✗"}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Write panel: transferFrom ─────────────────────────────────────────────────

function TransferPanel() {
  const { sdk } = useSoroban();
  const { address, signTransaction, isConnected } = useWallet();

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [tokenId, setTokenId] = useState<bigint>(1n);

  const signFn = useCallback(
    (xdr: string, opts: { networkPassphrase: string; address: string }) =>
      signTransaction(xdr, opts),
    [signTransaction]
  );

  const { write, loading, error, isSuccess, reset } = useTransferNFT(
    sdk,
    from || address || "",
    to,
    tokenId,
    { signTransaction: signFn }
  );

  const handleTransfer = async () => {
    if (!isConnected) {
      alert("Connect your wallet first");
      return;
    }
    await write();
  };

  if (isSuccess) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-lg p-4">
        <p className="text-green-800 font-semibold">Transfer submitted ✓</p>
        <button onClick={reset} className="mt-3 text-sm text-green-700 underline">
          Make another transfer
        </button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <h3 className="font-semibold">transferFrom(from, to, tokenId)</h3>

      <div>
        <label className="block text-xs text-gray-500 mb-1">From (leave blank to use connected wallet)</label>
        <input
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-full px-3 py-2 border rounded text-sm font-mono"
          placeholder={address || "G... Stellar address"}
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">To *</label>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-full px-3 py-2 border rounded text-sm font-mono"
          placeholder="G... recipient address"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Token ID *</label>
        <input
          type="number"
          min="1"
          value={tokenId.toString()}
          onChange={(e) => setTokenId(BigInt(e.target.value || "1"))}
          className="w-full px-3 py-2 border rounded text-sm"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
          {error.message}
        </div>
      )}

      <button
        onClick={handleTransfer}
        disabled={loading || !to}
        className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? "Submitting…" : "Transfer NFT"}
      </button>

      {!isConnected && (
        <p className="text-xs text-gray-500 text-center">Connect your wallet to sign transactions</p>
      )}
    </div>
  );
}

// ── Main demo component ───────────────────────────────────────────────────────

type Tab = "read" | "transfer";

export function NFT721Demo() {
  const [tab, setTab] = useState<Tab>("read");

  const tabs: { id: Tab; label: string }[] = [
    { id: "read", label: "Read (ownerOf / balanceOf / isValid)" },
    { id: "transfer", label: "Write (transferFrom)" },
  ];

  return (
    <div className="max-w-2xl">
      {/* Contract info banner */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <p className="font-semibold text-blue-900 mb-1">ERC-721 on Soroban — TicketNFT contract</p>
        <p className="text-blue-700">
          The <code className="bg-blue-100 px-1 rounded">ticket_nft</code> contract implements
          ERC-721 semantics: each token has a unique owner, supports{" "}
          <code className="bg-blue-100 px-1 rounded">ownerOf</code>,{" "}
          <code className="bg-blue-100 px-1 rounded">balanceOf</code>, and{" "}
          <code className="bg-blue-100 px-1 rounded">transferFrom</code>.
          Calls are made via the <code className="bg-blue-100 px-1 rounded">useTicketNFT</code> hooks
          which wrap <code className="bg-blue-100 px-1 rounded">useSorobanContractRead/Write</code>.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex space-x-4">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === "read" && <ReadPanel />}
      {tab === "transfer" && <TransferPanel />}
    </div>
  );
}

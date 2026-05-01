"use client";

import { useState } from "react";
import { useSoroban } from "@/contexts/SorobanContext";
import {
  useGetTBAAccount,
  useCreateTBAAccount,
  useTBAOwner,
  useTBANonce,
} from "@/hooks/useTBA";
import { useWallet } from "@/contexts/WalletContext";
import type { CreateAccountInput } from "../../sdk/src/types";

interface TBAManagerProps {
  tokenContract: string;
  tokenId: bigint;
}

export function TBAManager({ tokenContract, tokenId }: TBAManagerProps) {
  const { sdk } = useSoroban();
  const { signTransaction } = useWallet();
  const [implementationHash, setImplementationHash] = useState("");
  const [salt, setSalt] = useState("");

  const accountInput: CreateAccountInput = {
    implementationHash: implementationHash || "0".repeat(64),
    tokenContract,
    tokenId,
    salt: salt || "0".repeat(64),
  };

  const { data: accountAddress, loading: addressLoading } = useGetTBAAccount(
    sdk,
    accountInput,
    { enabled: !!implementationHash && !!salt },
  );

  const { data: owner, loading: ownerLoading } = useTBAOwner(sdk, {
    enabled: !!accountAddress,
  });

  const { data: nonce, loading: nonceLoading } = useTBANonce(sdk, {
    enabled: !!accountAddress,
  });

  const {
    write: createAccount,
    loading: creating,
    error,
    isSuccess,
  } = useCreateTBAAccount(sdk, accountInput, {
    signTransaction: signTransaction || (async (xdr) => xdr),
  });

  const handleCreate = async () => {
    if (!implementationHash || !salt) {
      alert("Please provide implementation hash and salt");
      return;
    }
    await createAccount();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold">Token Bound Account Manager</h2>

      <div className="border rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-lg">NFT Information</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Token Contract:</span>
            <span className="font-mono text-xs">{tokenContract}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Token ID:</span>
            <span className="font-mono">{tokenId.toString()}</span>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-lg">Create TBA Account</h3>

        <div>
          <label className="block text-sm font-medium mb-1">
            Implementation Hash (32 bytes hex)
          </label>
          <input
            type="text"
            value={implementationHash}
            onChange={(e) => setImplementationHash(e.target.value)}
            placeholder="0000000000000000000000000000000000000000000000000000000000000000"
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Salt (32 bytes hex)
          </label>
          <input
            type="text"
            value={salt}
            onChange={(e) => setSalt(e.target.value)}
            placeholder="0000000000000000000000000000000000000000000000000000000000000000"
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm">
            {error.message}
          </div>
        )}

        {isSuccess && (
          <div className="bg-green-50 border border-green-200 rounded p-3 text-green-800 text-sm">
            TBA Account created successfully!
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={creating || !implementationHash || !salt}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {creating ? "Creating..." : "Create TBA Account"}
        </button>
      </div>

      {accountAddress && (
        <div className="border rounded-lg p-6 space-y-4">
          <h3 className="font-semibold text-lg">TBA Account Details</h3>

          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-600 block mb-1">Account Address:</span>
              <code className="block p-2 bg-gray-100 rounded font-mono text-xs break-all">
                {accountAddress}
              </code>
            </div>

            {ownerLoading ? (
              <div className="text-gray-500">Loading owner...</div>
            ) : owner ? (
              <div>
                <span className="text-gray-600 block mb-1">Owner:</span>
                <code className="block p-2 bg-gray-100 rounded font-mono text-xs break-all">
                  {owner}
                </code>
              </div>
            ) : null}

            {nonceLoading ? (
              <div className="text-gray-500">Loading nonce...</div>
            ) : nonce !== undefined ? (
              <div className="flex justify-between">
                <span className="text-gray-600">Nonce:</span>
                <span className="font-mono">{nonce}</span>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

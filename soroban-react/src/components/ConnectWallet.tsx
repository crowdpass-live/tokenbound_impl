import React, { useState } from 'react';
import { isConnected, getAddress } from '@stellar/freighter-api';

export interface ConnectWalletProps {
  onConnect?: (address: string) => void;
  className?: string;
}

export const ConnectWallet: React.FC<ConnectWalletProps> = ({ onConnect, className }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const connected = await isConnected();
      if (!connected) {
        throw new Error('Freighter wallet not found. Please install it.');
      }
      const { address } = await getAddress();
      if (address) {
        setAddress(address);
        onConnect?.(address);
      } else {
        throw new Error('No address returned from wallet.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`soroban-connect-wallet ${className || ''}`}>
      {address ? (
        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span className="font-mono text-sm">{address.slice(0, 6)}...{address.slice(-4)}</span>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
};

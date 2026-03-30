"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  detectAvailableWalletProviders,
  connectWallet,
  signTransactionWithProvider,
  WalletProviderId,
  WalletProviderInfo,
} from './walletAdapters';

import { trackWalletConnection } from "@/lib/analytics";

interface WalletContextType {
  address: string | null;
  providerId: WalletProviderId;
  providerName: string;
  availableProviders: WalletProviderInfo[];
  isConnected: boolean;
  isInstalled: boolean;
  connect: (providerId?: WalletProviderId) => Promise<void>;
  disconnect: () => void;
  setProviderId: (providerId: WalletProviderId) => void;
  signTransaction: (txXdr: string, options: { networkPassphrase: string; address: string }) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const DEFAULT_PROVIDER: WalletProviderId = 'freighter';

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('wallet_address');
    }
    return null;
  });

  const [providerId, setProviderId] = useState<WalletProviderId>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('wallet_provider') as WalletProviderId) || DEFAULT_PROVIDER;
    }
    return DEFAULT_PROVIDER;
  });

  const [availableProviders, setAvailableProviders] = useState<WalletProviderInfo[]>([]);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    const checkWallets = async () => {
      try {
        const providers = await detectAvailableWalletProviders();
        setAvailableProviders(providers);

        const activeProvider = providers.find((p) => p.id === providerId);
        const installed = Boolean(activeProvider?.installed);
        setIsInstalled(installed);
      } catch (error) {
        console.error("Wallet provider detection failed", error);
        setAvailableProviders([]);
        setIsInstalled(false);
      }
    };

    checkWallets();
  }, [providerId]);

  const connect = async (selectedProviderId?: WalletProviderId) => {
    const providerToUse = selectedProviderId || providerId;
    try {
      const walletAddress = await connectWallet(providerToUse);
      setProviderId(providerToUse);
      setAddress(walletAddress);
      setIsInstalled(true);
      localStorage.setItem('wallet_address', walletAddress);
      localStorage.setItem('wallet_provider', providerToUse);
      trackWalletConnection();
    } catch (error: unknown) {
      setIsInstalled(false);
      console.error(`Failed to connect to ${providerToUse}:`, error);
      const message =
        error && typeof error === "object" && "message" in error
          ? (error as { message?: string }).message
          : undefined;
      alert(message || "Failed to connect to wallet provider.");
      throw error;
    }
  };

  const disconnect = () => {
    setAddress(null);
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('wallet_provider');
  };

  const signTransaction = async (txXdr: string, options: { networkPassphrase: string; address: string }) => {
    if (!isInstalled || !providerId) {
      throw new Error("Wallet provider not connected.");
    }
    return await signTransactionWithProvider(providerId, txXdr, options);
  };

  const providerName = useMemo(() => {
    const provider = availableProviders.find((p) => p.id === providerId);
    return provider ? provider.name : "Unknown";
  }, [availableProviders, providerId]);

  return (
    <WalletContext.Provider
      value={{
        address,
        providerId,
        providerName,
        availableProviders,
        isConnected: !!address,
        isInstalled,
        connect,
        disconnect,
        setProviderId: (id: WalletProviderId) => {
          setProviderId(id);
          localStorage.setItem('wallet_provider', id);
        },
        signTransaction,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
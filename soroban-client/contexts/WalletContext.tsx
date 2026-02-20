"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  isConnected,
  getPublicKey,
} from "@stellar/freighter-api";

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isInstalled: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    const checkInstallation = async () => {
      try {
        const installed = await isConnected();
        setIsInstalled(!!installed);
      } catch (e) {
        console.error("Freighter installation check failed", e);
      }
    };
    checkInstallation();
  }, []);

  const connect = async () => {
    try {
      const publicKey = await getPublicKey();
      if (publicKey) {
        setAddress(publicKey);
        localStorage.setItem('wallet_address', publicKey);
      }
    } catch (error) {
      console.error("Failed to connect to Freighter:", error);
    }
  };

  const disconnect = () => {
    setAddress(null);
    localStorage.removeItem('wallet_address');
  };

  // Persist connection state across page navigation
  useEffect(() => {
    const savedAddress = localStorage.getItem('wallet_address');
    if (savedAddress) {
      setAddress(savedAddress);
    }
  }, []);

  return (
    <WalletContext.Provider value={{
      address,
      isConnected: !!address,
      isInstalled,
      connect,
      disconnect
    }}>
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

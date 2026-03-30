// contexts/walletAdapters.ts
import {
  isConnected as freighterIsConnected,
  requestAccess as freighterRequestAccess,
  signTransaction as freighterSignTransaction,
} from "@stellar/freighter-api";

export type WalletProviderId = "freighter";

export interface WalletProviderInfo {
  id: WalletProviderId;
  name: string;
  installUrl: string;
  installed: boolean;
  description: string;
}

declare global {
  interface Window {
    freighter?: {
      isConnected?: () => Promise<{ isConnected: boolean }>;
      getPublicKey?: () => Promise<string>;
      requestAccess?: () => Promise<{ address: string }>;
      signTransaction?: (xdr: string, opts: { networkPassphrase: string; address?: string }) => Promise<{ signedTxXdr: string }>;
    };
    stellar?: {
      freighter?: {
        isConnected?: () => Promise<{ isConnected: boolean }>;
        getPublicKey?: () => Promise<string>;
        requestAccess?: () => Promise<{ address: string }>;
        signTransaction?: (xdr: string, opts: { networkPassphrase: string; address?: string }) => Promise<{ signedTxXdr: string }>;
      };
    };
  }
}

export const ALL_WALLET_PROVIDERS: Array<WalletProviderInfo> = [
  {
    id: "freighter",
    name: "Freighter",
    installUrl: "https://www.freighter.app/",
    installed: false,
    description: "Browser extension for Stellar accounts.",
  },
];

export async function detectAvailableWalletProviders(): Promise<WalletProviderInfo[]> {
  if (typeof window === "undefined") {
    return ALL_WALLET_PROVIDERS.map((wallet) => ({ ...wallet, installed: false }));
  }

  console.log("Detecting wallet providers...");
  console.log("window.freighter:", window.freighter);
  console.log("window.stellar:", window.stellar);
  
  // Check multiple possible locations for Freighter
  const freighterInstalled = Boolean(
    window.freighter || 
    (window.stellar && window.stellar.freighter) ||
    (window as any).freighterWallet
  );
  
  console.log("Freighter installed detected:", freighterInstalled);
  
  // Try to verify connection if installed
  if (freighterInstalled) {
    try {
      // Try different ways to check connection
      if (window.freighter && window.freighter.isConnected) {
        const result = await window.freighter.isConnected();
        console.log("Freighter isConnected result:", result);
      } else if (window.stellar && window.stellar.freighter && window.stellar.freighter.isConnected) {
        const result = await window.stellar.freighter.isConnected();
        console.log("Freighter (stellar) isConnected result:", result);
      }
    } catch (error) {
      console.error("Error checking Freighter connection:", error);
    }
  }

  return ALL_WALLET_PROVIDERS.map((wallet) => ({
    ...wallet,
    installed: freighterInstalled,
  }));
}

export async function connectWallet(providerId: WalletProviderId): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Wallet connection unavailable on server side.");
  }

  console.log("Connecting to wallet:", providerId);
  
  switch (providerId) {
    case "freighter": {
      // Try to get Freighter from various possible locations
      const freighter = window.freighter || 
                        (window.stellar && window.stellar.freighter) ||
                        (window as any).freighterWallet;
      
      if (!freighter) {
        console.error("Freighter object not found. Available:", {
          freighter: window.freighter,
          stellar: window.stellar,
          freighterWallet: (window as any).freighterWallet
        });
        throw new Error("Freighter is not installed. Please install the Freighter extension.");
      }
      
      console.log("Found Freighter object:", freighter);
      
      // Try to request access
      try {
        let response;
        
        if (freighter.requestAccess) {
          response = await freighter.requestAccess();
          console.log("Freighter requestAccess response:", response);
        } else if (freighter.getPublicKey) {
          const publicKey = await freighter.getPublicKey();
          console.log("Freighter getPublicKey response:", publicKey);
          response = { address: publicKey };
        } else {
          throw new Error("Freighter API not available. Please update your Freighter extension.");
        }
        
        if (response?.address) {
          console.log("Successfully connected to Freighter:", response.address);
          return response.address;
        }
        
        throw new Error(response?.error || "Failed to connect to Freighter. Please ensure you have unlocked Freighter.");
      } catch (error: any) {
        console.error("Freighter connection error:", error);
        throw new Error(error.message || "Failed to connect to Freighter. Please check if Freighter is unlocked.");
      }
    }

    default:
      throw new Error("Unsupported wallet provider.");
  }
}

export async function signTransactionWithProvider(
  providerId: WalletProviderId,
  txXdr: string,
  options: { networkPassphrase: string; address: string }
): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Cannot sign transaction on server side.");
  }

  switch (providerId) {
    case "freighter": {
      const freighter = window.freighter || 
                        (window.stellar && window.stellar.freighter) ||
                        (window as any).freighterWallet;
      
      if (!freighter) {
        throw new Error("Freighter is not installed.");
      }
      
      if (!freighter.signTransaction) {
        throw new Error("Freighter signTransaction API not available.");
      }
      
      const result = await freighter.signTransaction(txXdr, {
        networkPassphrase: options.networkPassphrase,
        address: options.address,
      });
      
      if (!result?.signedTxXdr) {
        throw new Error("Freighter failed to sign transaction.");
      }
      
      return result.signedTxXdr;
    }

    default:
      throw new Error("Unsupported wallet provider.");
  }
}
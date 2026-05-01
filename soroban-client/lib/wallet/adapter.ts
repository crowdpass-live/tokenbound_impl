export interface WalletAdapter {
  isConnected: boolean;
  isInstalled: boolean;
  address: string | null;
  connect(): Promise<void>;
  disconnect(): void;
  signTransaction(txXdr: string, options?: SignOptions): Promise<string>;
}

export interface SignOptions {
  networkPassphrase: string;
  address: string;
}

export interface WalletConfig {
  networkPassphrase: string;
  horizonUrl: string;
}
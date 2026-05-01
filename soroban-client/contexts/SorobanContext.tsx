"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";
import { createTokenboundSdk } from "../sdk/src";
import type { TokenboundSdk } from "../sdk/src";
import type { TokenboundSdkConfig } from "../sdk/src/types";

interface SorobanContextValue {
  sdk: TokenboundSdk | null;
  config: TokenboundSdkConfig | null;
  isReady: boolean;
}

const SorobanContext = createContext<SorobanContextValue>({
  sdk: null,
  config: null,
  isReady: false,
});

export function useSoroban() {
  const context = useContext(SorobanContext);
  if (!context) {
    throw new Error("useSoroban must be used within SorobanProvider");
  }
  return context;
}

interface SorobanProviderProps {
  children: ReactNode;
  config: TokenboundSdkConfig;
}

export function SorobanProvider({ children, config }: SorobanProviderProps) {
  const sdk = useMemo(() => {
    try {
      return createTokenboundSdk(config);
    } catch (error) {
      console.error("Failed to create Soroban SDK:", error);
      return null;
    }
  }, [config]);

  const value = useMemo(
    () => ({
      sdk,
      config,
      isReady: sdk !== null,
    }),
    [sdk, config],
  );

  return (
    <SorobanContext.Provider value={value}>{children}</SorobanContext.Provider>
  );
}

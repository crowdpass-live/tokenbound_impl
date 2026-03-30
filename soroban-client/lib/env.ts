const REQUIRED_VARS = [
  "NEXT_PUBLIC_HORIZON_URL",
  "NEXT_PUBLIC_SOROBAN_RPC_URL",
  "NEXT_PUBLIC_NETWORK_PASSPHRASE",
  "NEXT_PUBLIC_EVENT_MANAGER_CONTRACT",
] as const;

function validateEnv(): void {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join("\n  ")}\n\n` +
        `Copy soroban-client/.env.example to soroban-client/.env.local and fill in the values.`
    );
  }
}

validateEnv();

export const env = {
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || "https://crowdpass.io",
  NEXT_PUBLIC_HORIZON_URL: process.env.NEXT_PUBLIC_HORIZON_URL!,
  NEXT_PUBLIC_SOROBAN_RPC_URL: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL!,
  NEXT_PUBLIC_NETWORK_PASSPHRASE: process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE!,
  NEXT_PUBLIC_EVENT_MANAGER_CONTRACT: process.env.NEXT_PUBLIC_EVENT_MANAGER_CONTRACT!,
} as const;

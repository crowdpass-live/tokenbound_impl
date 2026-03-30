# Frontend Documentation

CrowdPass includes multiple frontend implementations and client libraries to interact with the Soroban smart contracts.

## Available Clients

| Client | Technology | Description |
|--------|------------|-------------|
| `soroban-client` | Next.js, TypeScript | A comprehensive Next.js application for event management and ticket interaction. |
| `client` | Vite, React, Tailwind | A lightweight, fast React application for ticket holders. |
| `tokenbound-client` | Next.js, TypeScript | Focused specifically on the token-bound account management interface. |

## Shared Logic

The frontend clients share several core functionalities:
- **Wallet Connection**: Using Freighter, xBull, Albedo, or WalletConnect with a unified wallet adapter.
- **Contract Interaction**: Invoking Soroban functions for ticket purchase, event creation, etc.
- **TBA Management**: Viewing and managing assets held by ticket-bound accounts.

## Component Library

The projects use a variety of UI components designed for clarity and ease of use:
- **EventCard**: Displays event details and purchase options.
- **TicketCard**: Shows ticket ownership and associated TBA status.
- **WalletProvider**: Manages blockchain connection state.
- **TBAInterface**: A toolkit for interacting with token-bound accounts.

## Deployment

Frontends are typically deployed to platforms like Vercel or Netlify.

1. **Environment Variables**:
   ```env
   NEXT_PUBLIC_CONTRACT_ID=...
   NEXT_PUBLIC_NETWORK=testnet
   ```

2. **Build Command**:
   ```bash
   npm run build
   ```

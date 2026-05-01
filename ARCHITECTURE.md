# Tokenbound Implementation - Architecture Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Component Details](#component-details)
4. [Data Flow](#data-flow)
5. [Technology Stack](#technology-stack)
6. [Deployment Architecture](#deployment-architecture)

---

## System Overview

TokenBound is a comprehensive implementation of Token Bound Accounts (TBAs) on the Stellar blockchain. It consists of multiple layers:

- **Smart Contracts Layer**: Soroban smart contracts managing TBA logic
- **SDK Layer**: TypeScript/JavaScript client SDK for interactions
- **Frontend Layer**: Web applications (tokenbound-client, soroban-client)
- **Infrastructure**: Docker, deployment scripts, and CI/CD

---

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB["🌐 Web Frontend"]
        MOBILE["📱 Mobile Client"]
    end

    subgraph "Application Layer"
        TOKENBOUND_CLIENT["TokenBound Client<br/>(Next.js)"]
        SOROBAN_CLIENT["Soroban Client<br/>(Next.js + Event Platform)"]
    end

    subgraph "SDK Layer"
        TOKENBOUND_SDK["TokenBound SDK<br/>(TypeScript)"]
        SOROBAN_SDK["Soroban SDK<br/>(TypeScript)"]
    end

    subgraph "Blockchain Interaction"
        HORIZON["Stellar Horizon API"]
        RPC["Soroban RPC Server"]
        FAILOVER["RPC Failover Manager"]
    end

    subgraph "Smart Contracts Layer"
        TBA_REGISTRY["TBA Registry Contract"]
        TBA_ACCOUNT["TBA Account Contract<br/>(Individual Accounts)"]
        EVENT_MANAGER["Event Manager Contract"]
        TICKET_FACTORY["Ticket Factory Contract"]
        TICKET_NFT["Ticket NFT Contract<br/>(POAP)"]
        VAULT["Vault Contract"]
    end

    subgraph "Infrastructure"
        DOCKER["Docker Containers"]
        DEPLOYMENT["Deployment Scripts"]
        MONITORING["Monitoring Stack"]
    end

    WEB -->|interacts| TOKENBOUND_CLIENT
    MOBILE -->|interacts| SOROBAN_CLIENT
    TOKENBOUND_CLIENT -->|uses| TOKENBOUND_SDK
    SOROBAN_CLIENT -->|uses| SOROBAN_SDK
    TOKENBOUND_SDK -->|calls| FAILOVER
    SOROBAN_SDK -->|calls| FAILOVER
    FAILOVER -->|routes| RPC
    FAILOVER -->|routes| HORIZON
    RPC -->|submits| TBA_REGISTRY
    RPC -->|submits| EVENT_MANAGER
    EVENT_MANAGER -->|creates| TICKET_NFT
    TICKET_NFT -->|links to| TBA_ACCOUNT
    TBA_REGISTRY -->|manages| TBA_ACCOUNT
    TBA_ACCOUNT -->|interacts| VAULT
    VAULT -->|holds| TICKET_NFT
    DOCKER -->|runs| RPC
    DEPLOYMENT -->|deploys| TBA_REGISTRY
    MONITORING -->|observes| DOCKER

    style WEB fill:#4A90E2
    style TOKENBOUND_CLIENT fill:#7B68EE
    style SOROBAN_CLIENT fill:#7B68EE
    style TOKENBOUND_SDK fill:#50C878
    style SOROBAN_SDK fill:#50C878
    style TBA_REGISTRY fill:#FF6B6B
    style TBA_ACCOUNT fill:#FF8C42
    style EVENT_MANAGER fill:#FF8C42
    style TICKET_NFT fill:#FFB600
    style VAULT fill:#00D9FF
```

---

## Component Details

### 1. **Smart Contracts Layer** (Soroban)

#### TBA Registry Contract

- **Location**: `soroban-contract/contracts/tba_registry/`
- **Purpose**: Factory and directory for TBA accounts
- **Key Features**:
  - Deploys new TBA accounts for NFTs
  - Maintains registry of all TBA accounts
  - Manages account initialization

#### TBA Account Contract

- **Location**: `soroban-contract/contracts/tba_account/`
- **Purpose**: Individual token-bound smart account
- **Key Features**:
  - Owned by current NFT holder
  - Can hold and manage assets
  - Implements custom account interface

#### Event Manager Contract

- **Location**: `soroban-contract/contracts/event_manager/`
- **Purpose**: Manages event lifecycle
- **Key Features**:
  - Creates and manages events
  - Controls event state transitions
  - Links events to ticket contracts

#### Ticket NFT Contract

- **Location**: `soroban-contract/contracts/poap_nft/`
- **Purpose**: Event ticket representation (POAP-style)
- **Key Features**:
  - ERC-20 compatible interface
  - Event-specific metadata
  - Transfer and approval handling

#### Vault Contract

- **Location**: `soroban-contract/contracts/vault/`
- **Purpose**: Asset custody and management
- **Key Features**:
  - Holds and manages tokens
  - Access control via TBA

### 2. **SDK Layer** (TypeScript/JavaScript)

#### `soroban-client/sdk/`

- **TypeScript SDK** for Soroban contract interactions
- Components:
  - `core.ts`: Core SDK client, contract invocation
  - `decoders.ts`: Transaction result decoding
  - `tracer.ts`: Request tracing and debugging
  - `validation.ts`: Input validation
  - Generated contract types from Rust ABIs

#### Key Features:

- Contract invocation (read/write operations)
- Transaction building and simulation
- Error handling and mapping
- Retry logic with configurable policies
- RPC failover support

### 3. **Application Layer** (Frontend)

#### `tokenbound-client`

- **Next.js browser application**
- Purpose: User portal for tokenbound features
- Features:
  - Wallet connection
  - Account management
  - Asset transfers

#### `soroban-client`

- **Next.js + Marketplace Application**
- Purpose: Event platform and marketplace
- Features:
  - Event creation and management
  - Ticket marketplace
  - Analytics dashboard
  - Multi-language support (i18n)

### 4. **Infrastructure**

#### Docker & Deployment

- `docker-compose.yml`: Local development environment
- `soroban-contract/Dockerfile`: Contract compilation
- `client/Dockerfile`: Frontend containerization
- Deployment scripts in `scripts/`

#### Monitoring

- Health checks
- Gas estimation tracking
- Event logging
- Performance metrics

---

## Data Flow

### Event Creation Flow

```mermaid
sequenceDiagram
    participant User as User
    participant Frontend as Frontend<br/>(soroban-client)
    participant SDK as Soroban SDK
    participant RPC as Soroban RPC
    participant EventMgr as Event Manager<br/>Contract

    User->>Frontend: Create Event
    Frontend->>SDK: Build transaction
    SDK->>SDK: Simulate transaction
    SDK->>RPC: Submit transaction
    RPC->>EventMgr: Execute create_event
    EventMgr->>RPC: Event created
    RPC-->>SDK: Transaction confirmation
    SDK-->>Frontend: Success
    Frontend-->>User: Event created
```

### Ticket Purchase & TBA Linking

```mermaid
sequenceDiagram
    participant User as User
    participant Frontend as Frontend
    participant SDK as Soroban SDK
    participant RPC as Soroban RPC
    participant TicketNFT as Ticket NFT<br/>Contract
    participant TBARegistry as TBA Registry<br/>Contract
    participant TBAAccount as TBA Account<br/>Contract

    User->>Frontend: Purchase Ticket
    Frontend->>SDK: Build purchase transaction
    SDK->>RPC: Simulate & submit
    RPC->>TicketNFT: Mint ticket NFT
    TicketNFT->>TBARegistry: Request TBA creation
    TBARegistry->>TBAAccount: Deploy TBA for NFT
    TBAAccount->>TBAAccount: Initialize with NFT reference
    TBAAccount-->>TicketNFT: TBA address
    TicketNFT-->>RPC: Ticket minted + TBA linked
    RPC-->>SDK: Confirmation
    SDK-->>Frontend: Success
    Frontend-->>User: Ticket received with TBA
```

---

## Technology Stack

### Blockchain

- **Network**: Stellar
- **Smart Contract Platform**: Soroban
- **Language**: Rust

### Frontend

- **Framework**: Next.js (React)
- **Styling**: Tailwind CSS
- **State Management**: React Context (and optional Redux)
- **Internationalization**: next-intl
- **Build Tool**: Vite (for some packages)

### Backend/SDK

- **Language**: TypeScript/JavaScript
- **Testing**: Jest
- **HTTP Client**: Fetch API
- **RPC Client**: @stellar/js-stellar-sdk

### Infrastructure

- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **CI/CD**: GitHub Actions
- **Code Quality**: ESLint, Prettier, Rust fmt

---

## Deployment Architecture

```mermaid
graph LR
    subgraph "Development"
        DEVNET["Local Soroban<br/>Network"]
        DOCKER_DEV["Docker Compose<br/>Dev Environment"]
    end

    subgraph "Staging"
        TESTNET["Stellar<br/>Testnet"]
        SOROBAN_TEST["Soroban<br/>Testnet RPC"]
    end

    subgraph "Production"
        MAINNET["Stellar<br/>Mainnet"]
        SOROBAN_PROD["Soroban<br/>Production RPC"]
    end

    subgraph "Frontend Hosting"
        VERCEL["Vercel<br/>(Production)"]
        STAGING_HOST["Staging Host"]
    end

    DOCKER_DEV -->|local development| DEVNET
    DEVNET -->|test contracts| TESTNET
    TESTNET -->|validate & deploy| MAINNET
    TESTNET -->|RPC calls| SOROBAN_TEST
    MAINNET -->|RPC calls| SOROBAN_PROD
    SOROBAN_TEST -->|supports| STAGING_HOST
    SOROBAN_PROD -->|supports| VERCEL

    style DEVNET fill:#FFA500
    style TESTNET fill:#FFD700
    style MAINNET fill:#00AA00
    style VERCEL fill:#000000,color:#fff
```

---

## Key Design Patterns

### 1. **RPC Failover Pattern**

- Multiple RPC endpoints maintained
- Automatic failover on endpoint failure
- Health checks and retry logic
- Configurable endpoints per environment

### 2. **Event-Driven Architecture**

- Contract events for state changes
- Event indexing for analytics
- Real-time updates via event feeds

### 3. **SDK Abstraction Pattern**

- Separates contract complexity from frontend
- Provides type-safe interfaces
- Handles error mapping and transformation

### 4. **Factory Pattern**

- TBA Registry = Factory for creating TBA accounts
- Ticket Factory = Factory for creating ticket contracts

---

## Recent Additions

- ✅ ERC-20 compatibility layer in POAP NFT contract
- ✅ Gas estimation features for transaction planning
- ✅ Soroban v25 SDK support
- ✅ Enhanced error handling and diagnostics
- ✅ RPC failover manager with health checks
- ✅ Integration test suite for soroban-client
- ✅ Multi-language support (i18n) in web clients

---

## Related Documentation

- [Contract Architecture](./soroban-contract/docs/Architecture.md) - Detailed contract design
- [Deployment Guide](./DEPLOYMENT.md) - Deployment procedures
- [Contributing](./CONTRIBUTING.md) - Development guidelines
- [API Reference](./soroban-client/README.md) - SDK API documentation

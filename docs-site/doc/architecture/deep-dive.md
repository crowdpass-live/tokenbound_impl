# Architecture Deep Dive

Stellar TBA is a multi-contract system that implements Token Bound Accounts (TBAs) on the Stellar blockchain using Soroban smart contracts.

The architecture consists of two layers:

### Layer 1: TBA Infrastructure
The foundational layer that enables any NFT to have its own account:
- **TBA Account Contract**: Individual smart accounts.
- **TBA Registry Contract**: Factory and directory for TBA accounts.

### Layer 2: Reference Application
A complete event ticketing system that demonstrates TBA capabilities:
- **Event Manager Contract**: Event lifecycle management.
- **Ticket Factory Contract**: NFT contract deployment.
- **Ticket NFT Contract**: Event ticket representation.

## System Overview

```mermaid
graph TD
    subgraph "Application Layer (Layer 2)"
        EM[Event Manager] --> TF[Ticket Factory]
        TF --> TN[Ticket NFT]
    end

    subgraph "Infrastructure Layer (Layer 1)"
        TN -- owns --> TA[TBA Account]
        TR[TBA Registry] -- deploys --> TA
    end

    style EM fill:#f9f,stroke:#333,stroke-width:2px
    style TR fill:#bbf,stroke:#333,stroke-width:2px
    style TA fill:#dfd,stroke:#333,stroke-width:2px
```

---

## Core Components

### 1. TBA Account Contract
**Purpose**: Represents an individual token-bound account owned by a specific NFT.

- One instance per NFT (per salt).
- Controlled by the current NFT owner.
- Uses Soroban's `CustomAccountInterface`.

### 2. TBA Registry Contract
**Purpose**: Factory and directory for creating and tracking TBA accounts.

- Deterministic address calculation.
- Single source of truth for TBA creation.

### 3. Event Manager Contract
**Purpose**: Manages the entire event lifecycle from creation to refunds.

### 4. Ticket NFT Contract
**Purpose**: Represents event tickets as NFTs.

### 5. Ticket Factory Contract
**Purpose**: Deploys isolated Ticket NFT contracts for each event.

---

## Contract Interactions

### Event Creation Flow

```mermaid
sequenceDiagram
    participant User
    participant EM as Event Manager
    participant TF as Ticket Factory
    participant TN as Ticket NFT

    User->>EM: create_event()
    EM->>TF: deploy_ticket()
    TF->>TN: deploy()
    TN-->>TF: address
    TF-->>EM: address
    EM-->>User: event_id
```

### Ticket Purchase Flow

```mermaid
sequenceDiagram
    participant User
    participant EM as Event Manager
    participant TN as Ticket NFT
    participant TR as TBA Registry
    participant TA as TBA Account

    User->>EM: purchase()
    EM->>EM: Verify funds & event status
    EM->>TN: mint(token_id)
    EM->>TR: create_account(nft, id, salt)
    TR->>TA: deploy()
    TA-->>TR: address
    TR-->>EM: tba_address
    EM-->>User: Success
```

### Refund Claim Flow

```mermaid
sequenceDiagram
    participant User
    participant EM as Event Manager
    participant TN as Ticket NFT
    participant TR as TBA Registry
    participant TA as TBA Account
    participant PT as Payment Token

    User->>EM: claim_refund(event_id)
    EM->>TN: verify_owner(token_id)
    TN-->>EM: Confirmed
    EM->>TR: get_account(nft, id, salt)
    TR-->>EM: tba_address
    EM->>PT: transfer(amount, to: tba_address)
    PT-->>TA: Received
    EM-->>User: Success
```

> [!TIP]
> **Key Insight**: The refund goes to the TBA account, NOT the user's wallet. If the user transfers the NFT, the new owner gets the refund.

---

## Design Decisions

- **Separate NFT per Event**: Ensuring isolation and scalability.
- **TBA Refunds**: Empowering atomic transfers of tickets and associated assets.
- **One Ticket per User**: Preventing hoarding and ensuring fair distribution.
- **Deterministic Addresses**: Standardizing TBA cross-chain patterns.

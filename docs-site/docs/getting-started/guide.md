# Getting Started

Follow these steps to set up CrowdPass locally and start building.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Stellar CLI**: [Installation Guide](https://developers.stellar.org/docs/tools/developer-tools)
- **Soroban SDK**: [Setup Guide](https://soroban.stellar.org/docs/getting-started/setup)
- **Node.js**: Version 18 or higher.
- **Rust**: [Installation Guide](https://www.rust-lang.org/tools/install)

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/crowdpass-live/tokenbound_impl.git
   cd tokenbound_impl
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

## Local Development (Smart Contracts)

1. **Build the contracts**:
   ```bash
   cd soroban-contract
   soroban contract build
   ```

2. **Run contract tests**:
   ```bash
   cargo test
   ```

3. **Deploy to Testnet**:
   ```bash
   soroban contract deploy \
     --wasm target/wasm32-unknown-unknown/release/crowdpass.wasm \
     --network testnet
   ```

## Local Development (Frontend)

CrowdPass comes with multiple client implementations.

### Next.js Client
```bash
cd soroban-client
npm install
npm run dev
```

### Vite Client
```bash
cd client
npm install
npm run dev
```

---

Next steps: Learn about the [Architecture Deep Dive](../architecture/deep-dive.md).

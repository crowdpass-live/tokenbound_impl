# Stellar Token Bound Accounts (TBA)

> Making NFTs Smarter: Building the Future of Composable Digital Assets on Stellar
---

## 💡 The Problem We're Solving

**NFTs today are fundamentally limited.** They can represent ownership, sure. But they can't *do* anything. They can't hold assets. They can't interact with the world. They're static receipts in a dynamic ecosystem.

Think about it: You buy a concert ticket NFT for $100. The event gets canceled. Now what?

- The organizer has to track who bought tickets
- You need to prove you own the ticket
- The refund goes to your wallet, not the ticket itself
- If you sold the ticket before cancellation, the refund process breaks entirely

**This is broken.** NFTs should be more than just proof of ownership—they should be *autonomous entities* that can hold value, execute logic, and participate in the economy.

## 🚀 Our Vision: Token Bound Accounts

We're bringing **Token Bound Accounts (TBAs)** to Stellar—a paradigm shift that transforms every NFT into a smart account that can:

- **Own Assets**: Hold tokens, other NFTs, or any digital asset
- **Execute Transactions**: Interact with DeFi protocols, marketplaces, and other contracts
- **Maintain Identity**: Build reputation, history, and relationships over time
- **Transfer Atomically**: When the NFT moves, everything it owns moves with it

### The Technical Innovation

TBAs (originally pioneered as ERC-6551 on Ethereum) create a **deterministic smart account for every NFT**. Each account:

1. Has a unique, predictable address derived from the NFT's contract + token ID
2. Is controlled exclusively by the current NFT owner
3. Can hold and manage any asset on the chain
4. Transfers ownership atomically when the NFT is sold or transferred

**This unlocks composability.** Suddenly, your NFT isn't just a static image—it's a programmable entity with its own wallet, its own assets, and its own agency.

## 🎟️ Why Event Ticketing?

We're building TBAs on Stellar and proving the concept with an **event ticketing system** because it's the perfect use case that everyone can understand:

### The Current Ticketing Nightmare

**For Organizers:**
- Manual refund tracking when events are canceled or rescheduled
- Complex resale market management
- No way to reward loyal attendees across multiple events
- Fraud and counterfeit tickets

**For Attendees:**
- Refunds tied to payment methods (which might be closed/changed)
- Lost tickets mean lost value
- Can't easily verify authenticity
- No benefits for being a repeat customer

### How TBAs Fix This

Imagine buying a ticket to "ETHDenver 2026":

1. **Purchase**: You pay 50 USDC → Receive ticket NFT #1234
2. **TBA Created**: The ticket automatically has its own account (`ticket_1234_account`)
3. **Event Canceled**: Organizer sends 50 USDC refund → Goes directly to `ticket_1234_account`
4. **You Still Own It**: The refund lives in the ticket's account, not your wallet
5. **Resale Scenario**: Sell ticket to a friend → They get the NFT AND the refund automatically
6. **Bonus**: Organizer airdrops a "Sorry for cancellation" POAP → Also goes to the ticket's account

**The ticket is now a complete, self-contained asset.** Everything related to that event—the ticket, the refund, any perks—travels together as one atomic unit.

### Beyond Refunds: The Real Power

But we're not stopping at refunds. TBAs enable:

- **Tiered Access**: VIP tickets can hold special access tokens to backstage areas
- **Loyalty Programs**: Frequent attendees accumulate points directly in their ticket NFTs
- **Composable Perks**: Tickets can hold merchandise vouchers, drink tokens, or exclusive content access
- **Cross-Event Identity**: Your ticket from last year's conference can prove your attendance history
- **Marketplace Evolution**: The entire ticket + its assets can be bought/sold as one package

## 🌟 Why Stellar? Why Not Ethereum or Starknet?

We chose Stellar for very deliberate technical and practical reasons:

### 1. **Built-in Account Abstraction**

Stellar's Soroban has **native support for custom account contracts** via `CustomAccountInterface`. On Ethereum, account abstraction is bolted on (ERC-4337). On Starknet, it requires complex custom implementations.

**Result**: Our TBA implementation is cleaner, more gas-efficient, and leverages the protocol's native capabilities instead of fighting against them.

### 2. **Predictable, Low Costs**

Creating a TBA on Ethereum costs $20-100 in gas during peak times. On Stellar? **Pennies.** This makes TBAs practical for everyday use cases like $20 concert tickets, not just $10,000 NFT art.

### 3. **Speed**

~5 second finality means instant TBA creation, instant refunds, instant interactions. Users don't wait. Experiences feel native.

### 4. **Real-World Focus**

Stellar was built for payments and real-world assets. TBAs on Stellar naturally integrate with USDC, fiat on/off ramps, and compliance tools. Perfect for ticketing, loyalty programs, and mainstream adoption.

### 5. **Developer Experience**

Soroban uses Rust with a phenomenal SDK. Type safety, excellent tooling, and a language that developers actually want to use. Coming from Cairo (Starknet's language), Rust is a breath of fresh air.

## 🏗️ What We're Building

This is a complete, production-ready TBA implementation consisting of:

### Core Infrastructure

**1. TBA Account Contract** (`contracts/tba_account/`)
- Individual smart account owned by an NFT
- Holds assets, executes transactions
- Integrates with Stellar's native authorization
- **Status**: 🚧 In Development (Issue #2)

**2. TBA Registry Contract** (`contracts/tba_registry/`)
- Factory for creating TBA accounts
- Deterministic address calculation
- Tracks all deployed accounts
- **Status**: 🚧 In Development (Issue #3)

**3. Reentrancy Guard Helper** (`contracts/reentrancy_guard/`)
- Reusable lock pattern for cross-contract flows
- Blocks recursive execution during sensitive operations
- Used by `payment_splitter` and available to all new contracts
- **Status**: ✅ Implemented

**4. Multi-Admin Role Manager** (`contracts/multi_admin/`)
- Grant and revoke admin privileges
- Protects least-privilege defaults
- Prevents removal of the final admin
- **Status**: ✅ Implemented

**5. Permit Wallet Contract** (`contracts/permit_wallet/`)
- Off-chain signed permit approvals for token transfers
- Reduces direct approval transaction overhead
- Uses stored owner public keys and nonces for replay protection
- **Status**: ✅ Implemented

### Reference Application: Event Ticketing

**3. Ticket NFT Contract** (`contracts/ticket_nft/`)
- ERC721-equivalent for event tickets
- Role-based access (minters, pausers)
- One-per-user enforcement for event fairness
- **Status**: 📋 Planned (Issue #4)

**4. Ticket Factory Contract** (`contracts/ticket_factory/`)
- Deploys isolated NFT contracts per event
- Clean separation between different events
- **Status**: 📋 Planned (Issue #5)

**5. Event Manager Contract** (`contracts/event_manager/`)
- Create and manage events
- Ticket purchasing with USDC/XLM
- Refunds to TBAs when events are canceled
- Event rescheduling and cancellation
- **Status**: 📋 Planned (Issue #6-8)

### Architecture Flow

```
User wants to buy a ticket
         │
         ▼
┌─────────────────────┐
│  Event Manager      │ ──── Checks event exists, not sold out
│  Contract           │ ──── Takes payment (USDC)
└──────────┬──────────┘
           │
           │ Calls
           ▼
┌─────────────────────┐
│  Ticket Factory     │ ──── Deploys NFT contract (if first ticket)
└──────────┬──────────┘
           │
           │ Mints from
           ▼
┌─────────────────────┐
│  Ticket NFT         │ ──── Mints ticket #1234 to user
│  Contract           │
└──────────┬──────────┘
           │
           │ Triggers
           ▼
┌─────────────────────┐
│  TBA Registry       │ ──── Creates account for ticket #1234
└──────────┬──────────┘
           │
           │ Deploys
           ▼
┌─────────────────────┐
│  TBA Account        │ ──── ticket_1234_account created
│  (for ticket #1234) │ ──── Ready to receive refunds/assets
└─────────────────────┘

Event gets canceled
         │
         ▼
Event Manager sends refund ──► TBA Account (ticket_1234_account)
                                    │
                                    ▼
                          User can withdraw OR
                          Transfer ticket (refund moves with it)
```

**This project is 100% open source.** We believe TBAs should be a public good, not a proprietary technology.

### Why Open Source?

1. **Ecosystem Growth**: TBAs are infrastructure. They work best when everyone can build on them.
2. **Security**: Open code = more eyes = fewer bugs
3. **Innovation**: We can't imagine all use cases. The community will surprise us.
4. **Decentralization**: No single entity should control this technology.

### How to Contribute

We're actively seeking contributors for:

- **Smart Contract Development** (Rust/Soroban)
- **Testing & QA**
- **Documentation & Technical Writing**
- **Frontend Development** (React/TypeScript)
- **Security Review**
- **Use Case Design**

👉 **[See our open issues](https://github.com/crowdpass-live/tokenbound_impl/issues)** and find something that excites you!

New to Soroban? Look for `good first issue` labels. We're here to help you learn.

## 🔥 Why This Matters

**TBAs are the missing primitive in the NFT ecosystem.** They unlock:

### For Users
- True ownership with actual utility
- Assets that work across applications
- Simplified UX (one NFT = everything related)
- Protection from platform changes

### For Developers
- New design patterns and possibilities
- Composability at the asset level
- Reduced complexity in multi-asset scenarios
- Innovation space wide open

### For the Stellar Ecosystem
- Differentiation from other L1s
- Real-world use cases (ticketing, loyalty, gaming)
- Attract builders and users
- Showcase Soroban's capabilities

## 📚 Learn More

### Documentation
- [Architecture Deep Dive](docs/ARCHITECTURE.md)

### External Resources
- [ERC-6551 Standard](https://eips.ethereum.org/EIPS/eip-6551) (Original proposal)
- [Soroban Documentation](https://soroban.stellar.org/docs)
- [Tokenbound.org](https://tokenbound.org/) (Ethereum implementation)

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/yourusername/stellar-tba
cd stellar-tba

# Install Soroban CLI
cargo install --locked stellar-cli --features opt

# Build contracts
stellar contract build

# Run tests
cargo test

# Deploy to testnet (coming soon)
./scripts/deploy.sh testnet
```

## 📞 Get Involved

- **GitHub Issues**: [Report bugs, request features](https://github.com/yourusername/stellar-tba/issues)
- **GitHub Discussions**: [Ask questions, share ideas](https://github.com/yourusername/stellar-tba/discussions)
- **Discord**: Coming soon
- **Twitter**: Coming soon

## 🙏 Acknowledgments

Standing on the shoulders of giants:

- **Future Primitive** - ERC-6551 creators
- **Starknet Community** - Cairo TBA reference implementation
- **Stellar Development Foundation** - Soroban platform
- **Our Contributors** - Everyone building this with us

## 📜 License

MIT License - Free to use, modify, and distribute. See [LICENSE](LICENSE).

---

**Built with ❤️ by developers who believe NFTs should be more than just JPEGs.**

*We're not just building smart contracts. We're building the infrastructure for the next generation of digital ownership.*

**⭐ Star this repo** if you believe in composable NFTs and want to see this happen on Stellar!

---

### Technical Founder's Note

When we started researching TBAs, we saw implementations on Ethereum and Starknet. Ethereum's approach felt retrofitted—account abstraction wasn't native, so ERC-6551 had to work around limitations. Starknet's Cairo implementation was elegant but the language ecosystem is still immature.

Stellar's Soroban changed our perspective entirely. Here was a platform with:
- Native account abstraction
- Rust (a language we love)
- Real-world payment rails already built-in
- A community focused on utility, not hype

The event ticketing use case clicked immediately. We've all dealt with canceled events, lost tickets, and complicated refunds. Why can't the ticket itself hold the refund? Why can't it hold perks, access tokens, loyalty points?

TBAs solve this. And Stellar is the perfect home for them.

This is infrastructure work. It's not glamorous. It's hard. But it's foundational. Five years from now, every NFT on Stellar could have a TBA. That future is worth building.

Join us. Let's make NFTs smarter.

— *The Stellar TBA Team*
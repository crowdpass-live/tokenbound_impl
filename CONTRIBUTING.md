# Contributing to CrowdPass

Thank you for your interest in contributing to CrowdPass! We welcome contributions from the community and are excited to have you join us in building the future of decentralized event ticketing.

This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Style and Formatting](#code-style-and-formatting)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting Guidelines](#issue-reporting-guidelines)
- [Testing Guidelines](#testing-guidelines)
- [Getting Help](#getting-help)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful, constructive, and professional in all interactions.

## Getting Started

1. **Fork the repository** to your GitHub account
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/tokenbound_impl.git
   cd tokenbound_impl
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/crowdpass-live/tokenbound_impl.git
   ```
4. **Keep your fork synchronized**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

## Development Environment Setup

CrowdPass consists of smart contracts (Rust/Soroban) and frontend clients (React/Vite and Next.js). Follow these steps to set up your development environment:

### Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Rust**: Latest stable version
- **Soroban CLI**: Latest version
- **Git**: Latest version

### 1. Install Rust and Cargo

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

Verify installation:
```bash
rustc --version
cargo --version
```

### 2. Install Soroban CLI

```bash
cargo install --locked soroban-cli --features opt
```

Verify installation:
```bash
soroban --version
```

### 3. Configure Soroban for Stellar Testnet

```bash
# Add testnet network
soroban network add \
  --global testnet \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015"

# Create identity for testing
soroban keys generate --global alice --network testnet
```

### 4. Install Node.js Dependencies

#### For the React/Vite Client:
```bash
cd client
npm install
```

#### For the Next.js Client:
```bash
cd tokenbound-client
npm install
```

#### For the Soroban Client:
```bash
cd soroban-client
npm install
```

### 5. Build Smart Contracts

```bash
cd soroban-contract
cargo build --target wasm32-unknown-unknown --release
```

### 6. Run Development Servers

#### React/Vite Client:
```bash
cd client
npm run dev
```
Access at `http://localhost:5173`

#### Next.js Client:
```bash
cd tokenbound-client
npm run dev
```
Access at `http://localhost:3000`

## Project Structure

```
tokenbound_impl/
├── client/                    # React/Vite frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── tokenbound-client/         # Next.js frontend
│   ├── src/
│   └── package.json
├── soroban-client/           # JavaScript SDK for Soroban interaction
│   └── package.json
├── soroban-contract/         # Soroban smart contracts
│   ├── contracts/
│   │   ├── event_manager/    # Event creation and management
│   │   ├── ticket_nft/       # NFT ticket implementation
│   │   ├── ticket_factory/   # Ticket minting logic
│   │   ├── tba_account/      # Token-bound account implementation
│   │   └── tba_registry/     # Registry for TBA mappings
│   └── Cargo.toml
├── token_bound/              # Token-bound utilities
├── .github/                  # GitHub configuration
│   ├── ISSUE_TEMPLATE/
│   └── workflows/
├── README.md
└── CONTRIBUTING.md
```

## Development Workflow

1. **Create a new branch** for your work (see [Branch Naming Conventions](#branch-naming-conventions))
2. **Make your changes** following our code style guidelines
3. **Test your changes** thoroughly
4. **Commit your changes** with descriptive commit messages
5. **Push to your fork** and create a pull request
6. **Address review feedback** promptly and professionally

## Code Style and Formatting

### Rust/Soroban Contracts

- **Use `rustfmt`** for consistent formatting:
  ```bash
  cargo fmt --all
  ```
- **Use `clippy`** for linting:
  ```bash
  cargo clippy --all-targets --all-features -- -D warnings
  ```
- **Follow Rust naming conventions**:
  - `snake_case` for functions, variables, and modules
  - `PascalCase` for types and traits
  - `SCREAMING_SNAKE_CASE` for constants
- **Document public APIs** with doc comments (`///`)
- **Keep functions focused** and under 50 lines when possible
- **Use descriptive variable names** - avoid single-letter variables except for iterators

### JavaScript/TypeScript (Frontend)

- **Use ESLint** for linting:
  ```bash
  npm run lint
  ```
- **Follow the project's ESLint configuration** (already set up in `package.json`)
- **Use modern ES6+ syntax**: arrow functions, destructuring, async/await
- **Component naming**:
  - `PascalCase` for React components
  - `camelCase` for functions and variables
- **File naming**:
  - `PascalCase` for component files: `EventCard.jsx`
  - `camelCase` for utility files: `formatDate.js`
- **Use functional components** with hooks (no class components)
- **Keep components small** and focused on a single responsibility

### General Guidelines

- **Write clear, self-documenting code**
- **Add comments for complex logic** - explain the "why", not the "what"
- **Keep lines under 100 characters** when possible
- **Use meaningful commit messages** (see [Commit Message Guidelines](#commit-message-guidelines))
- **No console.log statements** in production code (use proper logging)
- **Handle errors gracefully** with try-catch blocks

## Branch Naming Conventions

Use descriptive branch names that indicate the type and scope of your work:

### Format

```
<type>/<issue-number>-<short-description>
```

### Types

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring without functional changes
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks, dependency updates

### Examples

```bash
feature/123-add-resale-functionality
fix/456-ticket-transfer-bug
docs/789-update-api-documentation
refactor/321-optimize-contract-storage
test/654-add-integration-tests
chore/987-upgrade-soroban-sdk
```

### Creating a Branch

```bash
git checkout -b feature/123-add-resale-functionality
```

## Commit Message Guidelines

Write clear, concise commit messages that explain what changed and why.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no functional changes)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

**Simple commit:**
```
feat: add ticket resale functionality
```

**Commit with scope:**
```
fix(event_manager): correct refund calculation logic
```

**Commit with body and footer:**
```
feat(ticket_nft): implement token-bound account support

- Add TBA initialization during minting
- Integrate with tba_registry contract
- Update metadata storage structure

Fixes #123
```

### Guidelines

- **Use imperative mood**: "add" not "added", "fix" not "fixed"
- **First line under 50 characters**: Keep subject line concise
- **Reference issues**: Use `Fixes #123` or `Closes #456` in footer
- **Explain the "why"**: Body should provide context, not just repeat the code
- **One logical change per commit**: Keep commits focused and atomic

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass**:
   ```bash
   # Run Rust tests
   cd soroban-contract
   cargo test
   
   # Run frontend tests
   cd client
   npm test
   ```

2. **Run linters and formatters**:
   ```bash
   # Rust
   cargo fmt --all
   cargo clippy --all-targets --all-features
   
   # JavaScript
   npm run lint
   ```

3. **Update documentation** if your changes affect usage or APIs

4. **Rebase on latest main**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

### Submitting a Pull Request

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/123-your-feature
   ```

2. **Open a Pull Request** on GitHub with:
   - **Clear title** following commit message conventions
   - **Description** explaining:
     - What changes were made
     - Why they were made
     - How to test them
     - Related issues (use `Fixes #123` to auto-close issues)
   - **Screenshots or GIFs** for UI changes
   - **Testing instructions** for reviewers

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #123

## How Has This Been Tested?
Describe testing approach

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] No new warnings introduced
```

### Review Process

- **Be patient**: Maintainers will review your PR as soon as possible
- **Be responsive**: Address feedback promptly
- **Be professional**: Keep discussions respective and constructive
- **Be collaborative**: Work with reviewers to improve your contribution

### After Approval

- **Maintainers will merge** your PR
- **Delete your branch** (optional):
  ```bash
  git branch -d feature/123-your-feature
  git push origin --delete feature/123-your-feature
  ```

## Issue Reporting Guidelines

### Before Creating an Issue

1. **Search existing issues** to avoid duplicates
2. **Check the documentation** - your question may already be answered
3. **Try the latest version** - the issue may already be fixed

### Creating an Issue

Use the appropriate issue template:

#### Bug Report

```markdown
**Describe the bug**
Clear and concise description of the bug

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen

**Screenshots**
If applicable, add screenshots

**Environment:**
- OS: [e.g., macOS, Ubuntu]
- Browser: [e.g., Chrome, Firefox]
- Version: [e.g., 1.0.0]

**Additional context**
Any other relevant information
```

#### Feature Request

```markdown
**Is your feature request related to a problem?**
Clear description of the problem

**Describe the solution you'd like**
Clear description of what you want to happen

**Describe alternatives you've considered**
Alternative solutions or features

**Additional context**
Mockups, examples, or other context
```

### Issue Labels

Maintainers will apply appropriate labels:
- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `priority:high` - Critical issues

## Testing Guidelines

### Rust/Soroban Contracts

Write unit tests for all contract functions:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_event() {
        // Test implementation
    }
}
```

Run tests:
```bash
cd soroban-contract
cargo test
```

### JavaScript/Frontend

Write tests using the project's testing framework:

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EventCard from './EventCard';

describe('EventCard', () => {
  it('renders event title', () => {
    render(<EventCard title="Test Event" />);
    expect(screen.getByText('Test Event')).toBeInTheDocument();
  });
});
```

### Integration Testing

Test contract interactions:
```bash
# Deploy to testnet and test end-to-end flows
soroban contract invoke \
  --id CONTRACT_ID \
  --network testnet \
  -- create_event --params ...
```

## Getting Help

- **Discord**: Join our community server (link in README)
- **GitHub Discussions**: Ask questions and share ideas
- **GitHub Issues**: Report bugs or request features
- **Email**: support@crowdpass.live

## Recognition

Contributors will be recognized in:
- The project README
- Release notes
- Our community channels

Thank you for contributing to CrowdPass! Together we're building the future of event ticketing. 🎫✨

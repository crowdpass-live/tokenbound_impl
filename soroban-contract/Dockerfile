# Dockerfile for Soroban Contract Compilation
FROM rust:1.75-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Soroban CLI
RUN cargo install --locked soroban-cli

# Add wasm32-unknown-unknown target
RUN rustup target add wasm32-unknown-unknown

WORKDIR /app

# Copy source code
COPY . .

# Default command: build contracts
CMD ["cargo", "build", "--target", "wasm32-unknown-unknown", "--release"]

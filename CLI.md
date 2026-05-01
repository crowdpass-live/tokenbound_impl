# `tokenbound` CLI

Command-line tool to streamline **deployment, upgrade, and management** of the CrowdPass Soroban contracts.

## Prerequisites

- Node.js 18+
- Soroban CLI installed (`soroban`)

## Install

From the repo root:

```bash
npm install
```

## Deploy contracts

```bash
npm run tokenbound -- deploy --network testnet --source deployer
```

Outputs a deployment JSON (default): `soroban-contract/deployments/<network>.json`

## Generic invoke

```bash
npm run tokenbound -- invoke --id C... --fn version --source deployer
```

Pass raw function arguments after `--args`:

```bash
npm run tokenbound -- invoke --id C... --fn get_event --args --event_id 1 --source deployer
```

## Upgrade management (upgradeable contracts)

Schedule an upgrade (timelocked):

```bash
npm run tokenbound -- upgrade --id C... --source deployer schedule --new-wasm-hash <hash>
```

Commit / cancel:

```bash
npm run tokenbound -- upgrade --id C... --source deployer commit
npm run tokenbound -- upgrade --id C... --source deployer cancel
```

Pause / unpause:

```bash
npm run tokenbound -- upgrade --id C... --source deployer pause
npm run tokenbound -- upgrade --id C... --source deployer unpause
```

Transfer admin:

```bash
npm run tokenbound -- upgrade --id C... --source deployer transfer-admin --new-admin G...
```

#!/usr/bin/env node
import { Command } from "commander";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function run(cmd, args, { cwd } = {}) {
  const res = spawnSync(cmd, args, {
    cwd,
    stdio: ["inherit", "pipe", "pipe"],
    encoding: "utf8",
  });

  if (res.error) {
    if (res.error.code === "ENOENT") {
      fail(
        `Missing required executable: ${cmd}\n\n` +
          `Install Stellar/Soroban CLI tooling first.\n` +
          `- Stellar CLI docs: https://developers.stellar.org/docs/tools/developer-tools\n` +
          `- Soroban CLI: cargo install --locked soroban-cli`,
      );
    }
    fail(`${cmd} failed to start: ${String(res.error)}`);
  }

  if (res.status !== 0) {
    const stderr = (res.stderr || "").trim();
    const stdout = (res.stdout || "").trim();
    fail(
      `${cmd} ${args.join(" ")} failed (exit ${res.status})\n` +
        (stderr ? `\n${stderr}\n` : "") +
        (stdout ? `\n${stdout}\n` : ""),
    );
  }

  return (res.stdout || "").trim();
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function writeJson(filePath, obj) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function resolveRepoRoot() {
  const stdout = run("git", ["rev-parse", "--show-toplevel"]);
  return stdout;
}

function sorobanArgs({ source, network, rpcUrl }) {
  const args = [];
  if (source) args.push("--source", source);
  if (network) args.push("--network", network);
  if (rpcUrl) args.push("--rpc-url", rpcUrl);
  return args;
}

const program = new Command()
  .name("tokenbound")
  .description("Deploy and manage CrowdPass Soroban contracts")
  .showHelpAfterError();

program
  .command("deploy")
  .description("Deploy all CrowdPass contracts in dependency order")
  .requiredOption(
    "--source <secret-or-identity>",
    "Soroban source secret key or identity name",
  )
  .option(
    "--network <name>",
    "Soroban network name (testnet|mainnet|standalone)",
    "testnet",
  )
  .option("--rpc-url <url>", "Override Soroban RPC URL")
  .option(
    "--contracts-dir <path>",
    "Path to soroban-contract directory",
    "soroban-contract",
  )
  .option("--out <path>", "Write deployment JSON output to this path")
  .option("--skip-build", "Skip `soroban contract build` step", false)
  .action((opts) => {
    const repoRoot = resolveRepoRoot();
    const contractsDir = path.resolve(repoRoot, opts.contractsDir);
    const outFile =
      opts.out ||
      path.join(contractsDir, "deployments", `${String(opts.network)}.json`);

    const cfg = readJson(outFile);

    if (!opts.skipBuild) {
      run("soroban", ["contract", "build"], { cwd: contractsDir });
    }

    const wasmDir = path.join(
      contractsDir,
      "target",
      "wasm32-unknown-unknown",
      "release",
    );

    const ensureWasm = (name) => {
      const wasmPath = path.join(wasmDir, `${name}.wasm`);
      if (!fs.existsSync(wasmPath)) {
        fail(
          `WASM not found: ${wasmPath}\n` +
            `Build contracts first with: (cd ${opts.contractsDir} && soroban contract build)`,
        );
      }
      return wasmPath;
    };

    const installWasm = (wasmPath) =>
      run("soroban", [
        "contract",
        "install",
        "--wasm",
        wasmPath,
        ...sorobanArgs({
          source: opts.source,
          network: opts.network,
          rpcUrl: opts.rpcUrl,
        }),
      ]);

    const deployContract = (wasmPath, constructorArgs = []) =>
      run("soroban", [
        "contract",
        "deploy",
        "--wasm",
        wasmPath,
        ...sorobanArgs({
          source: opts.source,
          network: opts.network,
          rpcUrl: opts.rpcUrl,
        }),
        "--",
        ...constructorArgs,
      ]);

    const invoke = (id, fnName, fnArgs = []) =>
      run("soroban", [
        "contract",
        "invoke",
        "--id",
        id,
        ...sorobanArgs({
          source: opts.source,
          network: opts.network,
          rpcUrl: opts.rpcUrl,
        }),
        "--",
        fnName,
        ...fnArgs,
      ]);

    // 1. Install tba_account WASM
    if (!cfg.tba_account_wasm_hash) {
      cfg.tba_account_wasm_hash = installWasm(ensureWasm("tba_account"));
      writeJson(outFile, cfg);
    }

    // 2. Install ticket_nft WASM
    if (!cfg.ticket_nft_wasm_hash) {
      cfg.ticket_nft_wasm_hash = installWasm(ensureWasm("ticket_nft"));
      writeJson(outFile, cfg);
    }

    // 3. Deploy tba_registry
    if (!cfg.tba_registry_id) {
      cfg.tba_registry_id = deployContract(ensureWasm("tba_registry"), [
        "--tba_account_wasm_hash",
        cfg.tba_account_wasm_hash,
      ]);
      writeJson(outFile, cfg);
    }

    // 4. Deploy ticket_factory
    if (!cfg.ticket_factory_id) {
      const adminAddress =
        run("soroban", ["keys", "address", opts.source]).trim() || opts.source;

      cfg.ticket_factory_admin = adminAddress;
      cfg.ticket_factory_id = deployContract(ensureWasm("ticket_factory"), [
        "--admin",
        adminAddress,
        "--ticket_wasm_hash",
        cfg.ticket_nft_wasm_hash,
      ]);
      writeJson(outFile, cfg);
    }

    // 5. Deploy event_manager and initialize
    if (!cfg.event_manager_id) {
      cfg.event_manager_id = deployContract(ensureWasm("event_manager"), []);
      writeJson(outFile, cfg);
    }

    if (!cfg.event_manager_initialized) {
      invoke(cfg.event_manager_id, "initialize", [
        "--ticket_factory",
        cfg.ticket_factory_id,
      ]);
      cfg.event_manager_initialized = "true";
      writeJson(outFile, cfg);
    }

    process.stdout.write(`${JSON.stringify(cfg, null, 2)}\n`);
  });

program
  .command("invoke")
  .description("Invoke any contract function via Soroban CLI")
  .requiredOption("--id <contractId>", "Contract ID (C...)")
  .requiredOption("--fn <name>", "Function name")
  .option(
    "--args <args...>",
    "Function args (pass through to soroban after --)",
    [],
  )
  .requiredOption(
    "--source <secret-or-identity>",
    "Soroban source secret key or identity name",
  )
  .option("--network <name>", "Soroban network name", "testnet")
  .option("--rpc-url <url>", "Override Soroban RPC URL")
  .action((opts) => {
    const stdout = run("soroban", [
      "contract",
      "invoke",
      "--id",
      opts.id,
      ...sorobanArgs({
        source: opts.source,
        network: opts.network,
        rpcUrl: opts.rpcUrl,
      }),
      "--",
      opts.fn,
      ...(opts.args || []),
    ]);
    process.stdout.write(`${stdout}\n`);
  });

program
  .command("upgrade")
  .description("Manage upgradeable CrowdPass contracts")
  .requiredOption("--id <contractId>", "Contract ID (C...)")
  .requiredOption(
    "--source <secret-or-identity>",
    "Soroban source secret key or identity name",
  )
  .option("--network <name>", "Soroban network name", "testnet")
  .option("--rpc-url <url>", "Override Soroban RPC URL")
  .addHelpText(
    "after",
    `\n\nExamples:\n` +
      `  tokenbound upgrade --id C... --source deployer schedule --new-wasm-hash <hash>\n` +
      `  tokenbound upgrade --id C... --source deployer commit\n` +
      `  tokenbound upgrade --id C... --source deployer cancel\n` +
      `  tokenbound upgrade --id C... --source deployer pause\n` +
      `  tokenbound upgrade --id C... --source deployer unpause\n` +
      `  tokenbound upgrade --id C... --source deployer transfer-admin --new-admin G...\n`,
  );

const upgrade = program.commands.find((c) => c.name() === "upgrade");
const upgradeInvoke = (baseOpts, fnName, fnArgs) => {
  const stdout = run("soroban", [
    "contract",
    "invoke",
    "--id",
    baseOpts.id,
    ...sorobanArgs({
      source: baseOpts.source,
      network: baseOpts.network,
      rpcUrl: baseOpts.rpcUrl,
    }),
    "--",
    fnName,
    ...fnArgs,
  ]);
  process.stdout.write(`${stdout}\n`);
};

upgrade
  .command("schedule")
  .description("Schedule an upgrade by WASM hash (timelocked)")
  .requiredOption("--new-wasm-hash <hash>", "New WASM hash (32-byte hash)")
  .action((sub, cmd) => {
    const base = cmd.parent.opts();
    upgradeInvoke(base, "schedule_upgrade", [
      "--new_wasm_hash",
      sub.newWasmHash,
    ]);
  });

upgrade
  .command("commit")
  .description("Commit the pending upgrade once timelock elapsed")
  .action((_, cmd) => {
    const base = cmd.parent.opts();
    upgradeInvoke(base, "commit_upgrade", []);
  });

upgrade
  .command("cancel")
  .description("Cancel the pending upgrade")
  .action((_, cmd) => {
    const base = cmd.parent.opts();
    upgradeInvoke(base, "cancel_upgrade", []);
  });

upgrade
  .command("pause")
  .description("Pause the contract (admin only)")
  .action((_, cmd) => {
    const base = cmd.parent.opts();
    upgradeInvoke(base, "pause", []);
  });

upgrade
  .command("unpause")
  .description("Unpause the contract (admin only)")
  .action((_, cmd) => {
    const base = cmd.parent.opts();
    upgradeInvoke(base, "unpause", []);
  });

upgrade
  .command("transfer-admin")
  .description("Transfer admin rights to a new address")
  .requiredOption("--new-admin <G...>", "New admin address")
  .action((sub, cmd) => {
    const base = cmd.parent.opts();
    upgradeInvoke(base, "transfer_admin", ["--new_admin", sub.newAdmin]);
  });

program.parse(process.argv);

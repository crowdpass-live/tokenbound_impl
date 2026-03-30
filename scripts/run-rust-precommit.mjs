import { execFileSync } from "node:child_process";

const stagedFiles = execFileSync(
  "git",
  ["diff", "--cached", "--name-only", "--diff-filter=ACMR"],
  {
    encoding: "utf8",
  },
)
  .split("\n")
  .map((file) => file.trim())
  .filter(Boolean);

const rustRelevantFile = stagedFiles.find((file) => {
  if (!file.startsWith("soroban-contract/")) {
    return false;
  }

  return file.endsWith(".rs") || file.endsWith("Cargo.toml");
});

if (!rustRelevantFile) {
  process.exit(0);
}

execFileSync(
  "cargo",
  ["fmt", "--manifest-path", "soroban-contract/Cargo.toml", "--all", "--check"],
  { stdio: "inherit" },
);

execFileSync(
  "cargo",
  [
    "clippy",
    "--manifest-path",
    "soroban-contract/Cargo.toml",
    "--all-targets",
    "--all-features",
    "--",
    "-D",
    "warnings",
  ],
  { stdio: "inherit" },
);

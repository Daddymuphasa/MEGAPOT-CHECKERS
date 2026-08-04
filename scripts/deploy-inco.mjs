#!/usr/bin/env node
/**
 * Deploys contracts/ConfidentialCheckers.sol to Base Sepolia.
 *
 * Uses Foundry's `forge create` (recommended — handles the @inco/lightning
 * import remapping automatically). If forge is not installed, prints
 * step-by-step Remix instructions instead.
 *
 *   1. cp .env.example .env.local  &&  set DEPLOYER_PRIVATE_KEY
 *   2. npm run inco:deploy
 *   3. put the printed address into NEXT_PUBLIC_INCO_CONTRACT and set
 *      NEXT_PUBLIC_INCO_MODE=live
 */
import { execSync, spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

// Minimal .env.local loader (no dependency).
const envPath = path.join(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const RPC = process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org";
const PK = process.env.DEPLOYER_PRIVATE_KEY;

function hasForge() {
  try {
    execSync("forge --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (!hasForge()) {
  console.log(`
Foundry (forge) not found. Two options:

A) Install Foundry (recommended):
     curl -L https://foundry.paradigm.xyz | bash && foundryup     (Linux/macOS)
     — or on Windows: https://getfoundry.sh
   then re-run:  npm run inco:deploy

B) Deploy via Remix (no install):
   1. Open https://remix.ethereum.org and create ConfidentialCheckers.sol,
      pasting the contents of contracts/ConfidentialCheckers.sol.
   2. Remix resolves the @inco/lightning import from npm automatically.
   3. Compile with Solidity 0.8.24+.
   4. In Deploy & Run, select "Injected Provider" with your wallet on
      Base Sepolia (chain 84532) and press Deploy.
   5. Copy the deployed address into .env.local:
        NEXT_PUBLIC_INCO_CONTRACT=0x...
        NEXT_PUBLIC_INCO_MODE=live
`);
  process.exit(0);
}

if (!PK) {
  console.error(
    "DEPLOYER_PRIVATE_KEY is not set (in .env.local or the environment).",
  );
  process.exit(1);
}

console.log(`Deploying ConfidentialCheckers to ${RPC} …`);
const res = spawnSync(
  "forge",
  [
    "create",
    "contracts/ConfidentialCheckers.sol:ConfidentialCheckers",
    "--rpc-url",
    RPC,
    "--private-key",
    PK,
    "--broadcast",
    "--remappings",
    `@inco/lightning/=${path.join(root, "node_modules", "@inco", "lightning")}/`,
  ],
  { stdio: "inherit", cwd: root, shell: process.platform === "win32" },
);

if (res.status === 0) {
  console.log(`
✓ Deployed. Next steps:
  1. Copy the "Deployed to:" address above into .env.local:
       NEXT_PUBLIC_INCO_CONTRACT=<address>
       NEXT_PUBLIC_INCO_MODE=live
  2. Restart the dev server (or redeploy on Vercel with the same env vars).
`);
}
process.exit(res.status ?? 1);

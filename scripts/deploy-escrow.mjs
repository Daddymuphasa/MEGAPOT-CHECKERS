#!/usr/bin/env node
/**
 * Deploys contracts/CheckersEscrow.sol to Base mainnet.
 *
 * Constructor args:
 *   _usdc:     0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913  (native USDC on Base)
 *   _treasury: your wallet address (earns the 2% platform fee)
 *
 * Usage:
 *   1. Set DEPLOYER_PRIVATE_KEY and TREASURY_ADDRESS in .env.local
 *   2. npm run escrow:deploy
 *
 * If forge is not installed, prints Remix instructions instead.
 */
import { execSync, spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const envPath = path.join(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const RPC = process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";
const PK = process.env.DEPLOYER_PRIVATE_KEY;
const TREASURY = process.env.TREASURY_ADDRESS;
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

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
╔══════════════════════════════════════════════════════════════╗
║  Foundry (forge) not found — Deploy via Remix instead:      ║
╚══════════════════════════════════════════════════════════════╝

  1. Open https://remix.ethereum.org
  2. Create a new file "CheckersEscrow.sol" and paste the contents
     of contracts/CheckersEscrow.sol.
  3. Remix resolves @openzeppelin imports from npm automatically.
  4. Compile with Solidity 0.8.24+.
  5. In "Deploy & Run":
     - Environment: "Injected Provider" (MetaMask on Base mainnet, chain 8453)
     - Contract: CheckersEscrow
     - Constructor args:
         _usdc:     ${USDC}
         _treasury: <YOUR_WALLET_ADDRESS>
     - Click Deploy and confirm in MetaMask.
  6. Copy the deployed address into .env.local:
       NEXT_PUBLIC_ESCROW_CONTRACT=0x...
       NEXT_PUBLIC_ESCROW_MODE=live

  Note: You need a small amount of ETH on Base for gas (~$0.01).
`);
  process.exit(0);
}

if (!PK) {
  console.error(
    "Error: DEPLOYER_PRIVATE_KEY is not set.\n" +
    "Add it to .env.local or set it in the environment.\n"
  );
  process.exit(1);
}

if (!TREASURY) {
  console.error(
    "Error: TREASURY_ADDRESS is not set.\n" +
    "This is the wallet that receives the 2% platform fee.\n" +
    "Add it to .env.local or set it in the environment.\n"
  );
  process.exit(1);
}

console.log(`
  Chain:    Base mainnet (8453)
  RPC:      ${RPC}
  USDC:     ${USDC}
  Treasury: ${TREASURY}
`);
console.log("Deploying CheckersEscrow…\n");

const res = spawnSync(
  "forge",
  [
    "create",
    "contracts/CheckersEscrow.sol:CheckersEscrow",
    "--rpc-url", RPC,
    "--private-key", PK,
    "--broadcast",
    "--constructor-args", USDC, TREASURY,
    "--remappings",
    `@openzeppelin/=${path.join(root, "node_modules", "@openzeppelin")}/`,
  ],
  { stdio: "inherit", cwd: root, shell: process.platform === "win32" },
);

if (res.status === 0) {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ✓ CheckersEscrow deployed to Base mainnet!                  ║
╚══════════════════════════════════════════════════════════════╝

Next steps:
  1. Copy the "Deployed to:" address into .env.local:
       NEXT_PUBLIC_ESCROW_CONTRACT=<address>
       NEXT_PUBLIC_ESCROW_MODE=live
  2. Restart the dev server or redeploy on Vercel with the same env vars.
`);
}
process.exit(res.status ?? 1);

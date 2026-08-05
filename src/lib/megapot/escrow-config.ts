/** CheckersEscrow contract configuration on Base mainnet. */

import { megapotConfig } from "./config";

export const escrowConfig = {
  /**
   * "mock" → wagers simulated locally via wager-store (no wallet needed).
   * "live" → real USDC escrow on Base mainnet via CheckersEscrow contract.
   */
  mode: (process.env.NEXT_PUBLIC_ESCROW_MODE as "mock" | "live") ?? "mock",
  /** CheckersEscrow contract address on Base mainnet. Set after deployment. */
  contractAddress: (process.env.NEXT_PUBLIC_ESCROW_CONTRACT ??
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  /** USDC on Base mainnet (same as Megapot). */
  usdcAddress: megapotConfig.usdcAddress,
  rpcUrl: megapotConfig.rpcUrl,
} as const;

export function isEscrowLive() {
  return (
    escrowConfig.mode === "live" &&
    escrowConfig.contractAddress !==
      "0x0000000000000000000000000000000000000000"
  );
}

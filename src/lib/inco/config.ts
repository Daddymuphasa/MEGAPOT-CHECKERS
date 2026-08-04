/** Inco Lightning + Base configuration, driven by public env vars. */

export const BASE_SEPOLIA_ID = 84532;

export const incoConfig = {
  /**
   * "mock"  → encryption/decryption simulated locally; no wallet or chain
   *            required. The full UX (commit → play → reveal → settle) works.
   * "live"  → real @inco/js encryption + on-chain settlement on Base Sepolia.
   */
  mode: (process.env.NEXT_PUBLIC_INCO_MODE as "mock" | "live") ?? "mock",
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? BASE_SEPOLIA_ID),
  contractAddress: (process.env.NEXT_PUBLIC_INCO_CONTRACT ??
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  rpcUrl:
    process.env.NEXT_PUBLIC_RPC_URL ?? "https://sepolia.base.org",
  explorer: "https://sepolia.basescan.org",
} as const;

export function isLive() {
  return (
    incoConfig.mode === "live" &&
    incoConfig.contractAddress !==
      "0x0000000000000000000000000000000000000000"
  );
}

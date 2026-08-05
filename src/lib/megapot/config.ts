/** Megapot jackpot configuration, driven by public env vars.
 *  Docs: https://docs.megapot.io — contract lives on Base mainnet (8453). */

export const BASE_MAINNET_ID = 8453;

const ZERO = "0x0000000000000000000000000000000000000000" as const;

export const megapotConfig = {
  /**
   * "mock" → jackpot state simulated locally; no wallet or chain required.
   *          The full UX (watch the pot climb → quick-pick → buy) works.
   * "live" → real Megapot Jackpot contract on Base mainnet via wagmi/viem.
   */
  mode: (process.env.NEXT_PUBLIC_MEGAPOT_MODE as "mock" | "live") ?? "mock",
  /** Megapot Jackpot contract (Base mainnet). */
  contractAddress: (process.env.NEXT_PUBLIC_MEGAPOT_CONTRACT ??
    "0x3bAe643002069dBCbcd62B1A4eb4C4A397d042a2") as `0x${string}`,
  /** Native USDC on Base mainnet — tickets are priced in USDC (6 decimals). */
  usdcAddress: (process.env.NEXT_PUBLIC_MEGAPOT_USDC ??
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913") as `0x${string}`,
  /** Your wallet — earns the referral share of every ticket bought in-app. */
  referrer: (process.env.NEXT_PUBLIC_MEGAPOT_REFERRER ?? ZERO) as `0x${string}`,
  rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "https://mainnet.base.org",
  /** Analytics tag sent as bytes32 `_source` with every purchase. */
  sourceTag: "megapot-checkers",
  explorer: "https://basescan.org",
} as const;

export function isMegapotLive() {
  return megapotConfig.mode === "live";
}

export function hasReferrer() {
  return megapotConfig.referrer !== ZERO;
}

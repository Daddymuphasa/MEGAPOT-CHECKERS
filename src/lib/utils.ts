import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Clamp a number to a range. */
export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Format wei-ish bigint/number to a short ETH string. */
export function formatEth(value: bigint | number, decimals = 4) {
  const n = typeof value === "bigint" ? Number(value) / 1e18 : value;
  return `${parseFloat(n.toFixed(decimals))}`;
}

/** Shorten an address 0x1234…abcd */
export function shortAddress(addr?: string | null, size = 4) {
  if (!addr) return "";
  return `${addr.slice(0, 2 + size)}…${addr.slice(-size)}`;
}

/** A short human-friendly room code, e.g. "KX7-9QP". */
export function makeRoomCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const pick = () => alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}`;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

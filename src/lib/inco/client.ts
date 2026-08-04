"use client";

import { incoConfig, isLive } from "./config";

export type Hex = `0x${string}`;

export interface EncryptResult {
  /** The Inco ciphertext handle to submit on-chain. */
  handle: Hex;
  /** A short display commitment shown in the UI. */
  commit: string;
}

function randHex(bytes: number): Hex {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== "undefined") crypto.getRandomValues(arr);
  else for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  return ("0x" +
    Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")) as Hex;
}

/** Small FNV-ish hash for a readable commitment string in the UI. */
function commitString(value: bigint, nonce: string) {
  let h = 2166136261;
  const s = `${value.toString()}:${nonce}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Confidential-compute service. Uses Inco Lightning (`@inco/js`) in live mode,
 * or a faithful local simulation in mock mode so the whole flow is demoable
 * without a funded Base Sepolia wallet. The live SDK is imported lazily so the
 * default (mock) path never bundles gRPC/proto dependencies.
 */
class IncoService {
  private lightning: unknown = null;

  get mode() {
    return isLive() ? "live" : "mock";
  }

  private async ensureLightning() {
    if (this.lightning) return this.lightning;
    // Lazy import — only reached in live mode.
    const mod = (await import("@inco/js/lite")) as {
      Lightning: { baseSepoliaTestnet: () => Promise<unknown> };
    };
    this.lightning = await mod.Lightning.baseSepoliaTestnet();
    return this.lightning;
  }

  /**
   * Encrypt a numeric value (e.g. a wager in wei, or a power seed) into an Inco
   * handle. In mock mode returns an opaque handle + commitment; the plaintext
   * stays with the caller until they choose to reveal it (commit–reveal).
   */
  async encrypt(value: bigint, account: string): Promise<EncryptResult> {
    const nonce = randHex(8);
    if (this.mode === "mock") {
      // Simulate ~encryption latency for realistic UX.
      await new Promise((r) => setTimeout(r, 450));
      return { handle: randHex(32), commit: commitString(value, nonce) };
    }
    try {
      const l = this.lightning
        ? this.lightning
        : await this.ensureLightning();
      const handle = (await (
        l as {
          encrypt: (
            v: bigint,
            ctx: { accountAddress: string; dappAddress: string },
          ) => Promise<Hex>;
        }
      ).encrypt(value, {
        accountAddress: account,
        dappAddress: incoConfig.contractAddress,
      })) as Hex;
      return { handle, commit: commitString(value, handle) };
    } catch (e) {
      console.warn("[inco] live encrypt failed, falling back to mock", e);
      return { handle: randHex(32), commit: commitString(value, nonce) };
    }
  }

  /**
   * Reveal (decrypt) previously committed handles. Live mode calls Inco's
   * attested reveal; mock mode returns an empty array (peers reveal their own
   * plaintext via the room channel, mirroring a commit–reveal scheme).
   */
  async revealPublic(handles: Hex[]): Promise<bigint[]> {
    if (this.mode === "mock") return [];
    try {
      const l = this.lightning ?? (await this.ensureLightning());
      const atts = await (
        l as {
          attestedReveal: (
            h: Hex[],
          ) => Promise<Array<{ plaintext: { value: unknown } }>>;
        }
      ).attestedReveal(handles);
      return atts.map((a) => BigInt(a.plaintext.value as string));
    } catch (e) {
      console.warn("[inco] live reveal failed", e);
      return [];
    }
  }
}

let _inco: IncoService | null = null;
export function inco() {
  if (!_inco) _inco = new IncoService();
  return _inco;
}

"use client";

import {
  createPublicClient,
  http,
  stringToHex,
  type WalletClient,
} from "viem";
import { base } from "viem/chains";
import { megapotConfig, isMegapotLive, hasReferrer, BASE_MAINNET_ID } from "./config";
import { JACKPOT_ABI, ERC20_ABI } from "./abi";

export interface JackpotState {
  drawingId: bigint;
  /** USDC, 6 decimals. */
  prizePool: bigint;
  /** USDC, 6 decimals. */
  ticketPrice: bigint;
  /** Unix seconds of the next drawing. */
  drawingTime: number;
  ballMax: number;
  bonusballMax: number;
  mode: "mock" | "live";
}

export interface Ticket {
  normals: number[];
  bonusball: number;
}

export interface PurchaseResult {
  hash: `0x${string}`;
  tickets: Ticket[];
}

const MOCK_TICKETS_KEY = "megapot.mock.tickets";

function randHex(bytes: number): `0x${string}` {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== "undefined") crypto.getRandomValues(arr);
  else for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  return ("0x" +
    Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")) as `0x${string}`;
}

function mockTicketsBought(): number {
  try {
    return Number(localStorage.getItem(MOCK_TICKETS_KEY) ?? 0);
  } catch {
    return 0;
  }
}

/** Next 00:00 UTC — the mock pot "draws" daily like the real thing. */
function nextUtcMidnight(now = Date.now()): number {
  const d = new Date(now);
  d.setUTCHours(24, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

/**
 * Megapot jackpot service. In live mode it talks to the real Jackpot contract
 * on Base mainnet; in mock mode it simulates a pot that climbs all day and
 * "draws" at midnight UTC, so the whole flow demos without a funded wallet.
 */
function makeBaseClient() {
  return createPublicClient({
    chain: base,
    transport: http(megapotConfig.rpcUrl),
  });
}

class MegapotService {
  private publicClient: ReturnType<typeof makeBaseClient> | null = null;

  get mode() {
    return isMegapotLive() ? "live" : "mock";
  }

  private client() {
    if (!this.publicClient) this.publicClient = makeBaseClient();
    return this.publicClient;
  }

  async getJackpot(): Promise<JackpotState> {
    if (this.mode === "mock") {
      const now = Date.now();
      const drawTime = nextUtcMidnight(now);
      const secsIntoDay = 86400 - (drawTime - Math.floor(now / 1000));
      // Pot opens the "day" at $96k and climbs ~$0.85/s, plus a slice of
      // every locally bought demo ticket.
      const pool =
        96_000_000_000n +
        BigInt(secsIntoDay) * 850_000n +
        BigInt(mockTicketsBought()) * 700_000n;
      return {
        drawingId: BigInt(Math.floor(now / 86_400_000)),
        prizePool: pool,
        ticketPrice: 1_000_000n, // $1
        drawingTime: drawTime,
        ballMax: 39,
        bonusballMax: 12,
        mode: "mock",
      };
    }

    const c = this.client();
    const drawingId = await c.readContract({
      address: megapotConfig.contractAddress,
      abi: JACKPOT_ABI,
      functionName: "currentDrawingId",
    });
    const s = await c.readContract({
      address: megapotConfig.contractAddress,
      abi: JACKPOT_ABI,
      functionName: "getDrawingState",
      args: [drawingId],
    });
    return {
      drawingId,
      prizePool: s.prizePool,
      ticketPrice: s.ticketPrice,
      drawingTime: Number(s.drawingTime),
      ballMax: s.ballMax,
      bonusballMax: s.bonusballMax,
      mode: "live",
    };
  }

  /** Random ticket: 5 unique normals in [1, ballMax] plus a bonus ball. */
  quickPick(state: Pick<JackpotState, "ballMax" | "bonusballMax">): Ticket {
    const normals = new Set<number>();
    while (normals.size < 5)
      normals.add(1 + Math.floor(Math.random() * state.ballMax));
    return {
      normals: [...normals].sort((a, b) => a - b),
      bonusball: 1 + Math.floor(Math.random() * state.bonusballMax),
    };
  }

  /**
   * Buy tickets. Mock mode simulates the purchase locally. Live mode switches
   * the wallet to Base mainnet, approves USDC if needed, then calls
   * `buyTickets` with this app's referrer + source tag.
   */
  async buyTickets(
    tickets: Ticket[],
    state: JackpotState,
    walletClient?: WalletClient | null,
  ): Promise<PurchaseResult> {
    if (this.mode === "mock") {
      await new Promise((r) => setTimeout(r, 900));
      try {
        localStorage.setItem(
          MOCK_TICKETS_KEY,
          String(mockTicketsBought() + tickets.length),
        );
      } catch {}
      return { hash: randHex(32), tickets };
    }

    if (!walletClient?.account) throw new Error("Connect a wallet first");
    const account = walletClient.account;

    if (walletClient.chain?.id !== BASE_MAINNET_ID) {
      try {
        await walletClient.switchChain({ id: BASE_MAINNET_ID });
      } catch {
        await walletClient.addChain({ chain: base });
        await walletClient.switchChain({ id: BASE_MAINNET_ID });
      }
    }

    const c = this.client();
    const cost = state.ticketPrice * BigInt(tickets.length);
    const allowance = await c.readContract({
      address: megapotConfig.usdcAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [account.address, megapotConfig.contractAddress],
    });
    if (allowance < cost) {
      const approveHash = await walletClient.writeContract({
        account,
        chain: base,
        address: megapotConfig.usdcAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [megapotConfig.contractAddress, cost],
      });
      await c.waitForTransactionReceipt({ hash: approveHash });
    }

    const referrers = hasReferrer() ? [megapotConfig.referrer] : [];
    const split = hasReferrer() ? [10n ** 18n] : [];
    const hash = await walletClient.writeContract({
      account,
      chain: base,
      address: megapotConfig.contractAddress,
      abi: JACKPOT_ABI,
      functionName: "buyTickets",
      args: [
        tickets.map((t) => ({ normals: t.normals, bonusball: t.bonusball })),
        account.address,
        referrers,
        split,
        stringToHex(megapotConfig.sourceTag, { size: 32 }),
      ],
    });
    await c.waitForTransactionReceipt({ hash });
    return { hash, tickets };
  }
}

let _megapot: MegapotService | null = null;
export function megapot() {
  if (!_megapot) _megapot = new MegapotService();
  return _megapot;
}

/** "$128,431" — whole dollars from a 6-decimal USDC amount. */
export function formatUsd(v: bigint): string {
  return "$" + Number(v / 1_000_000n).toLocaleString("en-US");
}

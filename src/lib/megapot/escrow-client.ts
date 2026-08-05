"use client";

import {
  createPublicClient,
  http,
  type WalletClient,
  type Log,
  decodeEventLog,
} from "viem";
import { base } from "viem/chains";
import { escrowConfig, isEscrowLive } from "./escrow-config";
import { ESCROW_ABI, ERC20_ABI } from "./abi";
import { BASE_MAINNET_ID } from "./config";

export interface EscrowGame {
  host: string;
  guest: string;
  stake: bigint;
  status: number; // 0=Open,1=Active,2=Reported,3=Settled,4=Cancelled,5=Refunded
  hostReport: string;
  guestReport: string;
  hostReported: boolean;
  guestReported: boolean;
  winner: string;
  claimed: boolean;
  createdAt: bigint;
  reportedAt: bigint;
}

function makeClient() {
  return createPublicClient({
    chain: base,
    transport: http(escrowConfig.rpcUrl),
  });
}

async function ensureBaseChain(wallet: WalletClient) {
  if (wallet.chain?.id !== BASE_MAINNET_ID) {
    try {
      await wallet.switchChain({ id: BASE_MAINNET_ID });
    } catch {
      await wallet.addChain({ chain: base });
      await wallet.switchChain({ id: BASE_MAINNET_ID });
    }
  }
}

async function ensureUsdcAllowance(
  wallet: WalletClient,
  amount: bigint,
) {
  if (!wallet.account) throw new Error("No account");
  const c = makeClient();
  const allowance = await c.readContract({
    address: escrowConfig.usdcAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [wallet.account.address, escrowConfig.contractAddress],
  });
  if (allowance < amount) {
    const hash = await wallet.writeContract({
      account: wallet.account,
      chain: base,
      address: escrowConfig.usdcAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [escrowConfig.contractAddress, amount],
    });
    await c.waitForTransactionReceipt({ hash });
  }
}

class EscrowService {
  get mode() {
    return isEscrowLive() ? "live" : "mock";
  }

  /**
   * Create a new escrow game. Returns the on-chain gameId.
   * @param stakeUsdc Stake in whole dollars (e.g. 2 = $2 USDC).
   */
  async createGame(
    stakeUsdc: number,
    wallet: WalletClient,
  ): Promise<{ gameId: bigint; hash: `0x${string}` }> {
    if (!wallet.account) throw new Error("Connect a wallet first");
    await ensureBaseChain(wallet);

    const stake = BigInt(stakeUsdc) * 1_000_000n; // USDC has 6 decimals
    await ensureUsdcAllowance(wallet, stake);

    const c = makeClient();
    const hash = await wallet.writeContract({
      account: wallet.account,
      chain: base,
      address: escrowConfig.contractAddress,
      abi: ESCROW_ABI,
      functionName: "createGame",
      args: [stake],
    });

    const receipt = await c.waitForTransactionReceipt({ hash });

    const log = receipt.logs.find((l: Log) => {
      try {
        const decoded = decodeEventLog({
          abi: ESCROW_ABI,
          data: l.data,
          topics: l.topics,
        });
        return decoded.eventName === "GameCreated";
      } catch {
        return false;
      }
    });

    let gameId = 0n;
    if (log) {
      const decoded = decodeEventLog({
        abi: ESCROW_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "GameCreated") {
        gameId = (decoded.args as { gameId: bigint }).gameId;
      }
    }

    return { gameId, hash };
  }

  /**
   * Join an existing escrow game. Transfers matching USDC.
   */
  async joinGame(
    gameId: bigint,
    wallet: WalletClient,
  ): Promise<`0x${string}`> {
    if (!wallet.account) throw new Error("Connect a wallet first");
    await ensureBaseChain(wallet);

    const c = makeClient();
    const game = await this.getGame(gameId);
    await ensureUsdcAllowance(wallet, game.stake);

    const hash = await wallet.writeContract({
      account: wallet.account,
      chain: base,
      address: escrowConfig.contractAddress,
      abi: ESCROW_ABI,
      functionName: "joinGame",
      args: [gameId],
    });
    await c.waitForTransactionReceipt({ hash });
    return hash;
  }

  /**
   * Cancel an open game (host only, before guest joins).
   */
  async cancelGame(
    gameId: bigint,
    wallet: WalletClient,
  ): Promise<`0x${string}`> {
    if (!wallet.account) throw new Error("Connect a wallet first");
    await ensureBaseChain(wallet);

    const c = makeClient();
    const hash = await wallet.writeContract({
      account: wallet.account,
      chain: base,
      address: escrowConfig.contractAddress,
      abi: ESCROW_ABI,
      functionName: "cancelGame",
      args: [gameId],
    });
    await c.waitForTransactionReceipt({ hash });
    return hash;
  }

  /**
   * Report the winner of a match. Both players must agree.
   * Pass address(0) for a draw.
   */
  async reportWinner(
    gameId: bigint,
    winner: `0x${string}`,
    wallet: WalletClient,
  ): Promise<`0x${string}`> {
    if (!wallet.account) throw new Error("Connect a wallet first");
    await ensureBaseChain(wallet);

    const c = makeClient();
    const hash = await wallet.writeContract({
      account: wallet.account,
      chain: base,
      address: escrowConfig.contractAddress,
      abi: ESCROW_ABI,
      functionName: "reportWinner",
      args: [gameId, winner],
    });
    await c.waitForTransactionReceipt({ hash });
    return hash;
  }

  /**
   * Winner claims the pot after both players agreed.
   */
  async claim(
    gameId: bigint,
    wallet: WalletClient,
  ): Promise<`0x${string}`> {
    if (!wallet.account) throw new Error("Connect a wallet first");
    await ensureBaseChain(wallet);

    const c = makeClient();
    const hash = await wallet.writeContract({
      account: wallet.account,
      chain: base,
      address: escrowConfig.contractAddress,
      abi: ESCROW_ABI,
      functionName: "claim",
      args: [gameId],
    });
    await c.waitForTransactionReceipt({ hash });
    return hash;
  }

  /**
   * Force refund after dispute timeout (24h with no agreement).
   */
  async forceRefund(
    gameId: bigint,
    wallet: WalletClient,
  ): Promise<`0x${string}`> {
    if (!wallet.account) throw new Error("Connect a wallet first");
    await ensureBaseChain(wallet);

    const c = makeClient();
    const hash = await wallet.writeContract({
      account: wallet.account,
      chain: base,
      address: escrowConfig.contractAddress,
      abi: ESCROW_ABI,
      functionName: "forceRefund",
      args: [gameId],
    });
    await c.waitForTransactionReceipt({ hash });
    return hash;
  }

  /**
   * Read a game's state from the contract.
   */
  async getGame(gameId: bigint): Promise<EscrowGame> {
    const c = makeClient();
    const raw = await c.readContract({
      address: escrowConfig.contractAddress,
      abi: ESCROW_ABI,
      functionName: "getGame",
      args: [gameId],
    });
    return {
      host: raw.host,
      guest: raw.guest,
      stake: raw.stake,
      status: raw.status,
      hostReport: raw.hostReport,
      guestReport: raw.guestReport,
      hostReported: raw.hostReported,
      guestReported: raw.guestReported,
      winner: raw.winner,
      claimed: raw.claimed,
      createdAt: raw.createdAt,
      reportedAt: raw.reportedAt,
    };
  }

  /**
   * Get the user's USDC balance on Base mainnet.
   */
  async getUsdcBalance(address: `0x${string}`): Promise<bigint> {
    const c = makeClient();
    return c.readContract({
      address: escrowConfig.usdcAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    });
  }
}

let _escrow: EscrowService | null = null;
export function escrow() {
  if (!_escrow) _escrow = new EscrowService();
  return _escrow;
}

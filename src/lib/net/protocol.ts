import type { Move, Player } from "@/lib/game/types";

/** Wire events exchanged between the two peers of an online game. */
export type RoomEvent =
  | { type: "hello"; role: Seat; you: string; snapshot: RoomSnapshot }
  | { type: "peer-joined"; name: string; seat: Seat }
  | { type: "peer-left"; seat: Seat }
  | { type: "move"; move: Move; by: Seat; ply: number }
  | { type: "chat"; text: string; by: Seat }
  | { type: "wager"; stakeCommit: string; by: Seat; buyInWei: string }
  | { type: "ready"; by: Seat }
  | { type: "reveal"; powers: RevealedPower[]; by: Seat }
  | { type: "settle"; winner: Player | "draw"; txHash?: string }
  | { type: "rematch"; by: Seat }
  | { type: "resign"; by: Seat }
  | { type: "signal"; data: unknown; by: Seat }; // WebRTC signaling passthrough

export interface RevealedPower {
  pieceId: string;
  power: string;
}

/** Host is always Red (moves first); guest is Black. */
export type Seat = "host" | "guest";
export const seatToPlayer: Record<Seat, Player> = { host: "red", guest: "black" };

export interface RoomPlayer {
  seat: Seat;
  name: string;
  address?: string;
  ready: boolean;
  wagerCommit?: string;
  buyInWei?: string;
}

export interface RoomSnapshot {
  code: string;
  players: RoomPlayer[];
  moves: { move: Move; by: Seat }[];
  started: boolean;
  withPowers: boolean;
  wagerEnabled: boolean;
  /** Winner-takes-all stake in whole dollars (0 = friendly game). */
  stakeUsd: number;
}

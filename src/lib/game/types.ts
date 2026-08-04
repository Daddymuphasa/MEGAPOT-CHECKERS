// Core domain types for English draughts (checkers).

export type Player = "red" | "black";
export const OTHER: Record<Player, Player> = { red: "black", black: "red" };

/**
 * Optional confidential power-up carried by a piece (online / Inco mode).
 * The *kind* is encrypted on-chain and stays hidden from the opponent until
 * the piece is captured or the game ends — a mechanic that is only trustless
 * with confidential compute.
 */
export type PowerKind = "none" | "shield" | "double" | "saboteur";

export interface Piece {
  /** Stable identity used as Framer Motion layoutId for buttery animation. */
  id: string;
  player: Player;
  king: boolean;
  /** Present only in online/Inco games; undefined otherwise. */
  power?: PowerKind;
  /** True once the (hidden) power has been revealed to both players. */
  powerRevealed?: boolean;
}

export type Cell = Piece | null;
/** 8×8 grid indexed as board[row][col]; row 0 is the top of the screen. */
export type Board = Cell[][];

export interface Pos {
  row: number;
  col: number;
}

export interface Move {
  from: Pos;
  to: Pos;
  /** Squares of opponent pieces removed by this move (in capture order). */
  captures: Pos[];
  /** Landing squares from origin to destination, for stepped animation. */
  path: Pos[];
  /** True if the moving man is crowned at the end of this move. */
  promote: boolean;
}

export interface RulesOptions {
  /** International-style long-range kings. Default false (standard English). */
  flyingKings: boolean;
  /** Plies without a capture or promotion before an automatic draw. */
  drawThreshold: number;
}

export const DEFAULT_RULES: RulesOptions = {
  flyingKings: false,
  drawThreshold: 80,
};

export type GameResult =
  | { kind: "playing" }
  | { kind: "win"; winner: Player; reason: "no-pieces" | "no-moves" | "resign" }
  | { kind: "draw"; reason: "inactivity" | "agreement" };

export type GameMode = "local" | "ai" | "online";
export type Difficulty = "easy" | "hard";

"use client";

import { create } from "zustand";
import {
  applyMove,
  createInitialBoard,
  evaluateResult,
  legalMoves,
  legalMovesFrom,
  pieceAt,
  samePos,
} from "@/lib/game/engine";
import {
  DEFAULT_RULES,
  OTHER,
  type Board,
  type Difficulty,
  type GameMode,
  type GameResult,
  type Move,
  type Piece,
  type Player,
  type Pos,
  type RulesOptions,
} from "@/lib/game/types";

export interface GameConfig {
  mode: GameMode;
  vsAI: boolean;
  difficulty: Difficulty;
  /** Which side the local human controls (AI / online). */
  humanSide: Player;
  /** Which side sits at the bottom of the screen. */
  orientation: Player;
  rules: RulesOptions;
  /** Inco confidential power-ups (online mode). */
  withPowers: boolean;
  allowUndo: boolean;
}

interface Snapshot {
  board: Board;
  toMove: Player;
  captured: { red: Piece[]; black: Piece[] };
  sinceProgress: number;
  moveNumber: number;
  lastMove: Move | null;
  result: GameResult;
}

export interface GameState extends GameConfig {
  board: Board;
  toMove: Player;
  selected: Pos | null;
  hints: Move[];
  captured: { red: Piece[]; black: Piece[] };
  history: Snapshot[];
  result: GameResult;
  lastMove: Move | null;
  sinceProgress: number;
  moveNumber: number;
  animating: boolean;
  aiThinking: boolean;

  newGame: (partial?: Partial<GameConfig>) => void;
  restart: () => void;
  selectSquare: (pos: Pos) => void;
  clearSelection: () => void;
  commitMove: (move: Move, opts?: { silent?: boolean }) => void;
  undo: () => void;
  resign: (player: Player) => void;
  agreeDraw: () => void;
  setResult: (result: GameResult) => void;
  setRules: (r: Partial<RulesOptions>) => void;
  setAiThinking: (v: boolean) => void;
  setAnimating: (v: boolean) => void;
  /** Replace board wholesale (online sync from remote peer). */
  syncState: (s: {
    board: Board;
    toMove: Player;
    lastMove: Move | null;
    result?: GameResult;
  }) => void;
}

const DEFAULT_CONFIG: GameConfig = {
  mode: "local",
  vsAI: false,
  difficulty: "hard",
  humanSide: "red",
  orientation: "red",
  rules: { ...DEFAULT_RULES },
  withPowers: false,
  allowUndo: true,
};

function snapshot(s: GameState): Snapshot {
  return {
    board: s.board.map((r) => r.map((c) => (c ? { ...c } : null))),
    toMove: s.toMove,
    captured: {
      red: [...s.captured.red],
      black: [...s.captured.black],
    },
    sinceProgress: s.sinceProgress,
    moveNumber: s.moveNumber,
    lastMove: s.lastMove,
    result: s.result,
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  ...DEFAULT_CONFIG,
  board: createInitialBoard(),
  toMove: "red",
  selected: null,
  hints: [],
  captured: { red: [], black: [] },
  history: [],
  result: { kind: "playing" },
  lastMove: null,
  sinceProgress: 0,
  moveNumber: 1,
  animating: false,
  aiThinking: false,

  newGame: (partial) => {
    const cfg = { ...DEFAULT_CONFIG, ...get(), ...partial } as GameConfig;
    set({
      ...cfg,
      board: createInitialBoard(cfg.withPowers),
      toMove: "red",
      selected: null,
      hints: [],
      captured: { red: [], black: [] },
      history: [],
      result: { kind: "playing" },
      lastMove: null,
      sinceProgress: 0,
      moveNumber: 1,
      animating: false,
      aiThinking: false,
    });
  },

  restart: () => {
    const s = get();
    set({
      board: createInitialBoard(s.withPowers),
      toMove: "red",
      selected: null,
      hints: [],
      captured: { red: [], black: [] },
      history: [],
      result: { kind: "playing" },
      lastMove: null,
      sinceProgress: 0,
      moveNumber: 1,
      animating: false,
      aiThinking: false,
    });
  },

  selectSquare: (pos) => {
    const s = get();
    if (s.result.kind !== "playing" || s.animating) return;

    // In AI/online modes the human may only move their own side.
    const humanControlled = s.mode === "local" || s.toMove === s.humanSide;
    if (!humanControlled) return;

    const piece = pieceAt(s.board, pos);

    // Clicking a legal destination for the currently selected piece.
    if (s.selected) {
      const move = s.hints.find((m) => samePos(m.to, pos));
      if (move) {
        get().commitMove(move);
        return;
      }
    }

    // Selecting one of your own pieces.
    if (piece && piece.player === s.toMove) {
      const hints = legalMovesFrom(s.board, pos, s.toMove, s.rules);
      set({ selected: pos, hints });
      return;
    }

    set({ selected: null, hints: [] });
  },

  clearSelection: () => set({ selected: null, hints: [] }),

  commitMove: (move) => {
    const s = get();
    if (s.result.kind !== "playing") return;

    const hist = [...s.history, snapshot(s)];
    const { board, captured, promoted } = applyMove(s.board, move);

    // Attribute captured pieces to the side that made them.
    const capturer = s.toMove;
    const nextCaptured = {
      red: [...s.captured.red],
      black: [...s.captured.black],
    };
    nextCaptured[capturer].push(...captured);

    const progressed = captured.length > 0 || promoted;
    const nextSince = progressed ? 0 : s.sinceProgress + 1;
    const next = OTHER[s.toMove];
    const result = evaluateResult(board, next, s.rules, nextSince);

    set({
      board,
      toMove: next,
      selected: null,
      hints: [],
      captured: nextCaptured,
      history: hist.slice(-200),
      lastMove: move,
      sinceProgress: nextSince,
      moveNumber: s.moveNumber + 1,
      result,
      animating: true,
    });
  },

  undo: () => {
    const s = get();
    if (!s.allowUndo || s.history.length === 0 || s.animating) return;
    // In AI mode, undo both the AI reply and the player's move.
    let steps = 1;
    if (s.mode === "ai" && s.history.length >= 2 && s.toMove === s.humanSide) {
      steps = 2;
    }
    const target = s.history[s.history.length - steps];
    const remaining = s.history.slice(0, s.history.length - steps);
    set({
      board: target.board,
      toMove: target.toMove,
      captured: target.captured,
      sinceProgress: target.sinceProgress,
      moveNumber: target.moveNumber,
      lastMove: target.lastMove,
      result: { kind: "playing" },
      history: remaining,
      selected: null,
      hints: [],
      animating: false,
      aiThinking: false,
    });
  },

  resign: (player) =>
    set({
      result: { kind: "win", winner: OTHER[player], reason: "resign" },
      selected: null,
      hints: [],
    }),

  agreeDraw: () =>
    set({
      result: { kind: "draw", reason: "agreement" },
      selected: null,
      hints: [],
    }),

  setResult: (result) => set({ result }),
  setRules: (r) => set((s) => ({ rules: { ...s.rules, ...r } })),
  setAiThinking: (v) => set({ aiThinking: v }),
  setAnimating: (v) => set({ animating: v }),

  syncState: ({ board, toMove, lastMove, result }) => {
    const s = get();
    const res =
      result ?? evaluateResult(board, toMove, s.rules, s.sinceProgress);
    set({
      board,
      toMove,
      lastMove,
      result: res,
      selected: null,
      hints: [],
      animating: true,
    });
  },
}));

/** Convenience selector: are there any legal moves for the side to move. */
export function hasMoves(board: Board, player: Player, rules: RulesOptions) {
  return legalMoves(board, player, rules).length > 0;
}

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  // Dev-only handle for debugging and E2E assertions.
  (window as unknown as { __gs: typeof useGameStore }).__gs = useGameStore;
}

import type { Board, Difficulty, Move, Player, RulesOptions } from "../game/types";
import { chooseMove } from "./minimax";

export type { AIChoice } from "./minimax";
export { chooseMove } from "./minimax";

interface PendingResolve {
  resolve: (m: { move: Move | null; score: number; nodes: number }) => void;
}

/**
 * Runs the AI in a Web Worker so deep search never blocks the UI thread.
 * Falls back to a synchronous computation if workers are unavailable (SSR,
 * older browsers, or worker construction failure).
 */
class AIEngine {
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, PendingResolve>();

  private ensure() {
    if (this.worker || typeof window === "undefined") return;
    try {
      this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });
      this.worker.onmessage = (
        e: MessageEvent<{ id: number; move: Move | null; score: number; nodes: number }>,
      ) => {
        const p = this.pending.get(e.data.id);
        if (p) {
          this.pending.delete(e.data.id);
          p.resolve(e.data);
        }
      };
      this.worker.onerror = () => {
        this.worker = null; // fall back to sync next call
      };
    } catch {
      this.worker = null;
    }
  }

  think(
    board: Board,
    player: Player,
    difficulty: Difficulty,
    opts: RulesOptions,
  ): Promise<{ move: Move | null; score: number; nodes: number }> {
    this.ensure();
    if (!this.worker) {
      // Synchronous fallback with a small delay for UX.
      return new Promise((resolve) => {
        setTimeout(() => {
          const r = chooseMove(board, player, difficulty, opts);
          resolve({ move: r.move, score: r.score, nodes: r.nodes });
        }, 300);
      });
    }
    const id = ++this.seq;
    return new Promise((resolve) => {
      this.pending.set(id, { resolve });
      this.worker!.postMessage({ id, board, player, difficulty, opts });
    });
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
    this.pending.clear();
  }
}

let singleton: AIEngine | null = null;
export function getAI() {
  if (!singleton) singleton = new AIEngine();
  return singleton;
}

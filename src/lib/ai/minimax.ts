import { applyMove, legalMoves } from "../game/engine";
import {
  type Board,
  type Difficulty,
  type Move,
  type Player,
  type RulesOptions,
  OTHER,
} from "../game/types";
import { evaluate } from "./evaluate";

const INF = 1_000_000;

interface SearchCtx {
  perspective: Player;
  opts: RulesOptions;
  deadline: number;
  nodes: number;
}

/** Order moves so captures (and bigger captures) are searched first. */
function order(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => b.captures.length - a.captures.length);
}

function search(
  board: Board,
  toMove: Player,
  depth: number,
  alpha: number,
  beta: number,
  ctx: SearchCtx,
): number {
  ctx.nodes++;
  const moves = legalMoves(board, toMove, ctx.opts);

  if (moves.length === 0) {
    // Side to move has no moves and loses. Prefer quicker wins / slower losses.
    return toMove === ctx.perspective ? -INF + (100 - depth) : INF - (100 - depth);
  }
  if (depth === 0 || (ctx.nodes & 1023) === 0 && Date.now() > ctx.deadline) {
    return evaluate(board, ctx.perspective, ctx.opts);
  }

  const ordered = order(moves);
  if (toMove === ctx.perspective) {
    let best = -INF;
    for (const m of ordered) {
      const nb = applyMove(board, m).board;
      const s = search(nb, OTHER[toMove], depth - 1, alpha, beta, ctx);
      if (s > best) best = s;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = INF;
    for (const m of ordered) {
      const nb = applyMove(board, m).board;
      const s = search(nb, OTHER[toMove], depth - 1, alpha, beta, ctx);
      if (s < best) best = s;
      if (best < beta) beta = best;
      if (alpha >= beta) break;
    }
    return best;
  }
}

export interface AIChoice {
  move: Move | null;
  score: number;
  nodes: number;
  depth: number;
}

const DEPTH: Record<Difficulty, number> = { easy: 3, hard: 7 };
const TIME_BUDGET: Record<Difficulty, number> = { easy: 400, hard: 2600 };
// How often Easy deliberately picks a sub-optimal move, to feel beatable.
const EASY_BLUNDER = 0.28;

/**
 * Choose a move for `player`. Easy adds noise and occasional blunders;
 * Hard searches deep with alpha-beta pruning and a time budget.
 */
export function chooseMove(
  board: Board,
  player: Player,
  difficulty: Difficulty,
  opts: RulesOptions,
): AIChoice {
  const roots = legalMoves(board, player, opts);
  if (roots.length === 0) return { move: null, score: 0, nodes: 0, depth: 0 };
  if (roots.length === 1)
    return { move: roots[0], score: 0, nodes: 1, depth: 0 };

  const depth = DEPTH[difficulty];
  const ctx: SearchCtx = {
    perspective: player,
    opts,
    deadline: Date.now() + TIME_BUDGET[difficulty],
    nodes: 0,
  };

  const scored = order(roots).map((move) => {
    const nb = applyMove(board, move).board;
    let s = search(nb, OTHER[player], depth - 1, -INF, INF, ctx);
    if (difficulty === "easy") s += (Math.random() - 0.5) * 60; // noise
    return { move, score: s };
  });

  scored.sort((a, b) => b.score - a.score);

  let chosen = scored[0];
  if (difficulty === "easy" && Math.random() < EASY_BLUNDER) {
    // Pick from the top-half of moves for a beatable-but-not-random feel.
    const pool = scored.slice(0, Math.max(2, Math.ceil(scored.length / 2)));
    chosen = pool[Math.floor(Math.random() * pool.length)];
  }

  return { move: chosen.move, score: chosen.score, nodes: ctx.nodes, depth };
}

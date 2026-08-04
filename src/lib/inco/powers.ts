import type { Board, Player, PowerKind } from "@/lib/game/types";
import { SIZE } from "@/lib/game/engine";

/** Deterministic PRNG (mulberry32) so a seed always yields the same powers. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POWER_POOL: Exclude<PowerKind, "none">[] = [
  "shield",
  "double",
  "saboteur",
];

/**
 * Secretly assign power-ups to a player's pieces, derived from a private seed.
 * Because the seed is encrypted with Inco Lightning and committed on-chain, the
 * opponent cannot learn (or grind) the assignment — yet it is provably fixed
 * before play. Mutates the given board in place and returns it.
 */
export function assignPowers(
  board: Board,
  player: Player,
  seed: bigint,
  count = 3,
): Board {
  const rand = rng(Number(seed % 2147483647n) + 1);
  const positions: { row: number; col: number }[] = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      const p = board[r][c];
      if (p && p.player === player) positions.push({ row: r, col: c });
    }
  // Fisher–Yates shuffle with the seeded RNG.
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  const chosen = positions.slice(0, Math.min(count, positions.length));
  chosen.forEach((pos, i) => {
    const piece = board[pos.row][pos.col];
    if (piece) {
      piece.power = POWER_POOL[i % POWER_POOL.length];
      piece.powerRevealed = false;
    }
  });
  return board;
}

/** Collect the (pieceId → power) mapping for a side, for on-end reveal. */
export function collectPowers(board: Board, player: Player) {
  const out: { pieceId: string; power: PowerKind }[] = [];
  for (const row of board)
    for (const p of row)
      if (p && p.player === player && p.power && p.power !== "none")
        out.push({ pieceId: p.id, power: p.power });
  return out;
}

import { SIZE, countPieces, legalMoves } from "../game/engine";
import { type Board, type Player, type RulesOptions, OTHER } from "../game/types";

const MAN = 100;
const KING = 172;

/**
 * Static evaluation from `player`'s perspective. Positive = good for player.
 * Blends material, advancement, back-rank defense, centre control, edge
 * safety and mobility — a compact but reasonably strong heuristic.
 */
export function evaluate(
  board: Board,
  player: Player,
  opts: RulesOptions,
): number {
  let score = 0;

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const p = board[row][col];
      if (!p) continue;
      const sign = p.player === player ? 1 : -1;

      let v = p.king ? KING : MAN;

      if (!p.king) {
        // Advancement toward the crown row.
        const progress = p.player === "red" ? SIZE - 1 - row : row;
        v += progress * 6;
        // Reward holding your own back rank (blocks enemy promotion).
        const homeRow = p.player === "red" ? SIZE - 1 : 0;
        if (row === homeRow) v += 14;
      }

      // Centre control is valuable; extreme edges slightly less mobile.
      const centreDist = Math.abs(3.5 - col) + Math.abs(3.5 - row);
      v += (7 - centreDist) * 2;
      if (col === 0 || col === SIZE - 1) v -= 4;

      score += sign * v;
    }
  }

  // Mobility (measured once per leaf, not per piece — keeps eval cheap).
  const myMoves = legalMoves(board, player, opts).length;
  const oppMoves = legalMoves(board, OTHER[player], opts).length;
  score += (myMoves - oppMoves) * 3;

  // Slight edge to whoever has more total pieces when material is close.
  const my = countPieces(board, player).total;
  const opp = countPieces(board, OTHER[player]).total;
  if (my > 0 && opp > 0 && my !== opp) {
    // Trading down while ahead is good (endgame pressure).
    score += (my - opp) * (my + opp <= 8 ? 8 : 2);
  }

  return score;
}

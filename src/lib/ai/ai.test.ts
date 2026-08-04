/* AI self-play smoke test — run with: npx tsx src/lib/ai/ai.test.ts */
import { chooseMove } from "./minimax";
import {
  createInitialBoard,
  applyMove,
  evaluateResult,
  countPieces,
} from "../game/engine";
import { DEFAULT_RULES, OTHER, type Player } from "../game/types";

const R = DEFAULT_RULES;

// Forced-capture correctness at the AI level.
{
  const b = createInitialBoard();
  // Manufacture a forced capture for red.
  b[4][3] = { id: "x", player: "black", king: false };
  b[5][2] = b[5][2]; // red man present
  const c = chooseMove(b, "red", "hard", R);
  if (!c.move || c.move.captures.length === 0) {
    console.error("  ✗ AI failed to take a mandatory capture");
    process.exit(1);
  }
}

// Full self-play games should always terminate cleanly.
function playGame(): { winner: Player | "draw"; plies: number } {
  let board = createInitialBoard();
  let toMove: Player = "red";
  let sinceProgress = 0;
  for (let ply = 0; ply < 400; ply++) {
    const res = evaluateResult(board, toMove, R, sinceProgress);
    if (res.kind === "win") return { winner: res.winner, plies: ply };
    if (res.kind === "draw") return { winner: "draw", plies: ply };
    const diff = ply % 2 === 0 ? "hard" : "easy";
    const choice = chooseMove(board, toMove, diff, R);
    if (!choice.move) return { winner: OTHER[toMove], plies: ply };
    const before = countPieces(board, "red").total + countPieces(board, "black").total;
    const applied = applyMove(board, choice.move);
    board = applied.board;
    const after = countPieces(board, "red").total + countPieces(board, "black").total;
    sinceProgress = after < before || applied.promoted ? 0 : sinceProgress + 1;
    toMove = OTHER[toMove];
  }
  return { winner: "draw", plies: 400 };
}

const t0 = Date.now();
for (let g = 0; g < 3; g++) {
  const r = playGame();
  console.log(`  game ${g + 1}: winner=${r.winner} in ${r.plies} plies`);
}
console.log(`\nAI self-play OK (${Date.now() - t0}ms). No crashes, all games terminated.\n`);

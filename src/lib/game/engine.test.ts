/* Lightweight assertion tests — run with: npx tsx src/lib/game/engine.test.ts */
import {
  SIZE,
  createInitialBoard,
  legalMoves,
  legalMovesFrom,
  applyMove,
  countPieces,
  evaluateResult,
  isPlayable,
  newPieceId,
} from "./engine";
import { DEFAULT_RULES, type Board, type Cell, type Player } from "./types";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error("  ✗ FAIL:", msg);
  }
}

function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array<Cell>(SIZE).fill(null));
}
function put(b: Board, row: number, col: number, player: Player, king = false) {
  b[row][col] = { id: newPieceId(), player, king };
}

const R = { ...DEFAULT_RULES };
const RF = { ...DEFAULT_RULES, flyingKings: true };

// 1. Initial setup
{
  const b = createInitialBoard();
  assert(countPieces(b, "red").total === 12, "red starts with 12");
  assert(countPieces(b, "black").total === 12, "black starts with 12");
  assert(legalMoves(b, "red", R).length === 7, "red has 7 opening moves");
  assert(legalMoves(b, "black", R).length === 7, "black has 7 opening moves");
}

// 2. Mandatory single capture
{
  const b = emptyBoard();
  put(b, 5, 2, "red");
  put(b, 4, 3, "black");
  const moves = legalMoves(b, "red", R);
  assert(moves.length === 1, "only the capture is legal (mandatory)");
  assert(moves[0].captures.length === 1, "one piece captured");
  assert(moves[0].to.row === 3 && moves[0].to.col === 4, "lands beyond victim");
  const res = applyMove(b, moves[0]);
  assert(res.captured.length === 1, "applyMove removes 1 piece");
  assert(countPieces(res.board, "black").total === 0, "victim gone");
}

// 3. Multi-jump (double)
{
  const b = emptyBoard();
  put(b, 6, 1, "red");
  put(b, 5, 2, "black");
  put(b, 3, 2, "black");
  const moves = legalMovesFrom(b, { row: 6, col: 1 }, "red", R);
  const dbl = moves.find((m) => m.captures.length === 2);
  assert(!!dbl, "a double jump exists");
  if (dbl) {
    // (6,1)→over(5,2)→(4,3)→over(3,2)→(2,1)
    assert(dbl.to.row === 2 && dbl.to.col === 1, "double jump ends at (2,1)");
    const res = applyMove(b, dbl);
    assert(res.captured.length === 2, "double jump captures 2");
  }
}

// 4. Man captures forward only (no backward capture for men)
{
  const b = emptyBoard();
  put(b, 3, 2, "red");
  put(b, 4, 3, "black"); // behind the red man (red moves up)
  const moves = legalMoves(b, "red", R);
  assert(
    moves.every((m) => m.captures.length === 0),
    "man cannot capture backward",
  );
}

// 5. Promotion to king
{
  const b = emptyBoard();
  put(b, 1, 2, "red");
  const moves = legalMovesFrom(b, { row: 1, col: 2 }, "red", R);
  const promo = moves.find((m) => m.to.row === 0);
  assert(!!promo && promo.promote, "reaching row 0 promotes red");
  if (promo) {
    const res = applyMove(b, promo);
    assert(res.promoted, "applyMove reports promotion");
    assert(res.board[0][promo.to.col]?.king === true, "piece is now a king");
  }
}

// 6. King moves & captures backward
{
  const b = emptyBoard();
  put(b, 4, 3, "red", true);
  put(b, 5, 4, "black");
  const moves = legalMovesFrom(b, { row: 4, col: 3 }, "red", R);
  const back = moves.find((m) => m.captures.length === 1 && m.to.row === 6);
  assert(!!back, "king captures backward/downward");
}

// 7a. Flying king long slide (no capture available)
{
  const b = emptyBoard();
  put(b, 7, 0, "red", true);
  const slides = legalMovesFrom(b, { row: 7, col: 0 }, "red", RF);
  assert(
    slides.some((m) => m.to.row === 4 && m.to.col === 3),
    "flying king slides multiple squares",
  );
  assert(slides.length === 7, "flying king reaches all 7 squares up the diagonal");
}
// 7b. Flying king long capture (mandatory)
{
  const b = emptyBoard();
  put(b, 7, 0, "red", true);
  put(b, 3, 4, "black");
  const cap = legalMovesFrom(b, { row: 7, col: 0 }, "red", RF).find(
    (m) => m.captures.length === 1,
  );
  assert(!!cap, "flying king captures at range");
  if (cap)
    assert(
      cap.to.row < 3 && cap.to.col > 4,
      "flying king lands beyond the victim",
    );
}

// 8. Win by no pieces / no moves
{
  const b = emptyBoard();
  put(b, 0, 1, "red");
  const res = evaluateResult(b, "black", R, 0);
  assert(res.kind === "win" && res.winner === "red", "no black pieces => red wins");

  // Black man fully blocked → no simple moves and no capture landings
  const b2 = emptyBoard();
  put(b2, 0, 1, "black");
  put(b2, 1, 0, "red"); // capture would land off-board at (2,-1)
  put(b2, 1, 2, "red");
  put(b2, 2, 3, "red"); // block the (1,2) capture landing
  const res2 = evaluateResult(b2, "black", R, 0);
  assert(
    res2.kind === "win" && res2.winner === "red",
    "black has no legal move => red wins",
  );
}

// 9. Only dark squares are playable
{
  assert(isPlayable(0, 1) && !isPlayable(0, 0), "dark-square parity correct");
}

console.log(`\nEngine tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);

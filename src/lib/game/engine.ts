import {
  type Board,
  type Cell,
  type Move,
  type Piece,
  type Player,
  type Pos,
  type RulesOptions,
  type GameResult,
  OTHER,
} from "./types";

export const SIZE = 8;

type Dir = readonly [number, number];
const ALL_DIRS: readonly Dir[] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];
// Red sits at the bottom and advances upward (decreasing row);
// Black sits at the top and advances downward (increasing row).
const FORWARD: Record<Player, readonly Dir[]> = {
  red: [
    [-1, -1],
    [-1, 1],
  ],
  black: [
    [1, -1],
    [1, 1],
  ],
};

let _idCounter = 0;
export function newPieceId(prefix = "p") {
  _idCounter += 1;
  return `${prefix}${_idCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

export function inBounds(row: number, col: number) {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

/** Playable (dark) squares are those where row+col is odd. */
export function isPlayable(row: number, col: number) {
  return (row + col) % 2 === 1;
}

export function pieceAt(board: Board, p: Pos): Cell {
  return board[p.row]?.[p.col] ?? null;
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((c) => (c ? { ...c } : null)));
}

const promotionRow: Record<Player, number> = { red: 0, black: SIZE - 1 };
function isPromotion(player: Player, row: number) {
  return promotionRow[player] === row;
}

export function createInitialBoard(withPowers = false): Board {
  const board: Board = Array.from({ length: SIZE }, () =>
    Array<Cell>(SIZE).fill(null),
  );
  const place = (player: Player, rows: number[]) => {
    for (const row of rows) {
      for (let col = 0; col < SIZE; col++) {
        if (isPlayable(row, col)) {
          board[row][col] = {
            id: newPieceId(player[0]),
            player,
            king: false,
            ...(withPowers ? { power: "none", powerRevealed: false } : {}),
          };
        }
      }
    }
  };
  place("black", [0, 1, 2]);
  place("red", [5, 6, 7]);
  return board;
}

function samePos(a: Pos, b: Pos) {
  return a.row === b.row && a.col === b.col;
}

// ------------------------------------------------------------------
//  Move generation
// ------------------------------------------------------------------

interface Seq {
  captures: Pos[];
  landings: Pos[];
  endKing: boolean;
}

function captureSeqs(
  b: Board,
  cur: Pos,
  player: Player,
  isKing: boolean,
  opts: RulesOptions,
): Seq[] {
  const out: Seq[] = [];
  const dirs = isKing ? ALL_DIRS : FORWARD[player];

  for (const [dr, dc] of dirs) {
    if (opts.flyingKings && isKing) {
      // Scan for the first piece along the diagonal.
      let r = cur.row + dr;
      let c = cur.col + dc;
      while (inBounds(r, c) && !b[r][c]) {
        r += dr;
        c += dc;
      }
      if (!inBounds(r, c)) continue;
      const victim = b[r][c];
      if (!victim || victim.player === player) continue;
      // Any empty square beyond the victim is a valid landing.
      let lr = r + dr;
      let lc = c + dc;
      while (inBounds(lr, lc) && !b[lr][lc]) {
        const nb = cloneBoard(b);
        nb[r][c] = null;
        const cap: Pos = { row: r, col: c };
        const land: Pos = { row: lr, col: lc };
        const cont = captureSeqs(nb, land, player, true, opts);
        if (cont.length) {
          for (const s of cont)
            out.push({
              captures: [cap, ...s.captures],
              landings: [land, ...s.landings],
              endKing: true,
            });
        } else {
          out.push({ captures: [cap], landings: [land], endKing: true });
        }
        lr += dr;
        lc += dc;
      }
    } else {
      const mr = cur.row + dr;
      const mc = cur.col + dc;
      const lr = cur.row + 2 * dr;
      const lc = cur.col + 2 * dc;
      if (!inBounds(lr, lc)) continue;
      const victim = b[mr]?.[mc];
      if (!victim || victim.player === player) continue;
      if (b[lr][lc]) continue; // landing must be empty
      const cap: Pos = { row: mr, col: mc };
      const land: Pos = { row: lr, col: lc };
      const nb = cloneBoard(b);
      nb[mr][mc] = null;
      const willPromote = !isKing && isPromotion(player, lr);
      if (willPromote) {
        // A man that reaches the crown row ends its turn immediately.
        out.push({ captures: [cap], landings: [land], endKing: true });
      } else {
        const cont = captureSeqs(nb, land, player, isKing, opts);
        if (cont.length) {
          for (const s of cont)
            out.push({
              captures: [cap, ...s.captures],
              landings: [land, ...s.landings],
              endKing: isKing,
            });
        } else {
          out.push({ captures: [cap], landings: [land], endKing: isKing });
        }
      }
    }
  }
  return out;
}

function simpleMoves(
  board: Board,
  from: Pos,
  piece: Piece,
  opts: RulesOptions,
): Move[] {
  const out: Move[] = [];
  const dirs = piece.king ? ALL_DIRS : FORWARD[piece.player];
  for (const [dr, dc] of dirs) {
    if (opts.flyingKings && piece.king) {
      let r = from.row + dr;
      let c = from.col + dc;
      while (inBounds(r, c) && !board[r][c]) {
        out.push({
          from,
          to: { row: r, col: c },
          captures: [],
          path: [from, { row: r, col: c }],
          promote: false,
        });
        r += dr;
        c += dc;
      }
    } else {
      const r = from.row + dr;
      const c = from.col + dc;
      if (inBounds(r, c) && !board[r][c]) {
        out.push({
          from,
          to: { row: r, col: c },
          captures: [],
          path: [from, { row: r, col: c }],
          promote: !piece.king && isPromotion(piece.player, r),
        });
      }
    }
  }
  return out;
}

/** All legal moves for a single piece, ignoring the global capture rule. */
export function movesForPiece(
  board: Board,
  from: Pos,
  opts: RulesOptions,
): { simple: Move[]; captures: Move[] } {
  const piece = pieceAt(board, from);
  if (!piece) return { simple: [], captures: [] };

  const lifted = cloneBoard(board);
  lifted[from.row][from.col] = null;
  const seqs = captureSeqs(lifted, from, piece.player, piece.king, opts);
  const captures: Move[] = seqs.map((s) => ({
    from,
    to: s.landings[s.landings.length - 1],
    captures: s.captures,
    path: [from, ...s.landings],
    promote: s.endKing && !piece.king,
  }));

  return { simple: simpleMoves(board, from, piece, opts), captures };
}

/**
 * All legal moves for `player`, enforcing the mandatory-capture rule:
 * if any capture exists, only captures are returned.
 */
export function legalMoves(
  board: Board,
  player: Player,
  opts: RulesOptions,
): Move[] {
  const allCaptures: Move[] = [];
  const allSimple: Move[] = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const piece = board[row][col];
      if (!piece || piece.player !== player) continue;
      const { simple, captures } = movesForPiece(board, { row, col }, opts);
      allCaptures.push(...captures);
      allSimple.push(...simple);
    }
  }
  return allCaptures.length ? allCaptures : allSimple;
}

/** Legal moves for a specific origin square, respecting mandatory capture. */
export function legalMovesFrom(
  board: Board,
  from: Pos,
  player: Player,
  opts: RulesOptions,
): Move[] {
  const all = legalMoves(board, player, opts);
  return all.filter((m) => samePos(m.from, from));
}

// ------------------------------------------------------------------
//  Applying moves
// ------------------------------------------------------------------

export interface ApplyResult {
  board: Board;
  captured: Piece[];
  promoted: boolean;
  moved: Piece;
}

export function applyMove(board: Board, move: Move): ApplyResult {
  const next = cloneBoard(board);
  const piece = next[move.from.row][move.from.col];
  if (!piece) throw new Error("applyMove: no piece at origin");

  const captured: Piece[] = [];
  for (const cp of move.captures) {
    const victim = next[cp.row][cp.col];
    if (victim) captured.push(victim);
    next[cp.row][cp.col] = null;
  }

  next[move.from.row][move.from.col] = null;
  const promoted = move.promote && !piece.king;
  const moved: Piece = { ...piece, king: piece.king || move.promote };
  next[move.to.row][move.to.col] = moved;

  return { board: next, captured, promoted, moved };
}

// ------------------------------------------------------------------
//  Status helpers
// ------------------------------------------------------------------

export function countPieces(board: Board, player: Player) {
  let men = 0;
  let kings = 0;
  for (const row of board)
    for (const c of row)
      if (c && c.player === player) {
        if (c.king) kings++;
        else men++;
      }
  return { men, kings, total: men + kings };
}

/**
 * Determine game status for the player *about to move*.
 * `sinceProgress` = plies since the last capture or promotion (for draws).
 */
export function evaluateResult(
  board: Board,
  toMove: Player,
  opts: RulesOptions,
  sinceProgress: number,
): GameResult {
  if (countPieces(board, toMove).total === 0) {
    return { kind: "win", winner: OTHER[toMove], reason: "no-pieces" };
  }
  if (legalMoves(board, toMove, opts).length === 0) {
    return { kind: "win", winner: OTHER[toMove], reason: "no-moves" };
  }
  if (sinceProgress >= opts.drawThreshold) {
    return { kind: "draw", reason: "inactivity" };
  }
  return { kind: "playing" };
}

/** Compact string key of a position (for repetition / hashing). */
export function boardKey(board: Board, toMove: Player): string {
  let s = toMove === "red" ? "R" : "B";
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const p = board[row][col];
      if (!p) s += ".";
      else if (p.player === "red") s += p.king ? "R" : "r";
      else s += p.king ? "B" : "b";
    }
  }
  return s;
}

export { samePos };

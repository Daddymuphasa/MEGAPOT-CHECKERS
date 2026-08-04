"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import { useSettings, type BoardSkin } from "@/store/settings-store";
import { SIZE, samePos } from "@/lib/game/engine";
import { OTHER, type Move, type Player, type Pos } from "@/lib/game/types";
import { sound, haptic } from "@/lib/sound";
import { PieceToken } from "./Piece";

/* ---------- board skins ---------- */
const SKINS: Record<
  BoardSkin,
  { frame: string; light: string; dark: string; lightTx?: string; darkTx?: string }
> = {
  walnut: {
    frame: "linear-gradient(145deg,#4b3220,#2a1a10)",
    light: "linear-gradient(145deg,#ecd9b8,#dcc297)",
    dark: "linear-gradient(145deg,#8a5a38,#5f3a24)",
    lightTx:
      "repeating-linear-gradient(115deg,rgba(120,80,40,.06) 0 2px,transparent 2px 7px)",
    darkTx:
      "repeating-linear-gradient(115deg,rgba(0,0,0,.12) 0 2px,transparent 2px 6px)",
  },
  marble: {
    frame: "linear-gradient(145deg,#2b2f3a,#14161d)",
    light: "linear-gradient(145deg,#f4f5f8,#dfe3ea)",
    dark: "linear-gradient(145deg,#3a4150,#242a36)",
    lightTx:
      "radial-gradient(120% 120% at 20% 10%,rgba(120,130,160,.14),transparent 55%)",
    darkTx:
      "radial-gradient(120% 120% at 80% 90%,rgba(180,190,220,.10),transparent 55%)",
  },
  neon: {
    frame: "linear-gradient(145deg,#141826,#0a0d16)",
    light: "linear-gradient(145deg,rgba(56,224,250,.16),rgba(124,92,246,.10))",
    dark: "linear-gradient(145deg,#171a2b,#0d1020)",
    lightTx: "none",
    darkTx: "none",
  },
};

/* ---------- geometry helpers ---------- */
function toVisual(pos: Pos, orientation: Player) {
  return orientation === "red"
    ? { vr: pos.row, vc: pos.col }
    : { vr: SIZE - 1 - pos.row, vc: SIZE - 1 - pos.col };
}
function fromVisual(vr: number, vc: number, orientation: Player): Pos {
  return orientation === "red"
    ? { row: vr, col: vc }
    : { row: SIZE - 1 - vr, col: SIZE - 1 - vc };
}

function useElementWidth<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [width, setWidth] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function moveDurationMs(move: Move) {
  const segs = Math.max(1, move.path.length - 1);
  return move.captures.length ? 210 * segs + 140 : 300;
}

interface BoardProps {
  /** Called once a move's animation has settled (for AI / online turns). */
  onMoveSettled?: (move: Move) => void;
  /** Which side is viewing (for hidden Inco powers). */
  viewerSide?: Player | "spectator";
  interactive?: boolean;
}

export function Board({ onMoveSettled, viewerSide, interactive = true }: BoardProps) {
  const board = useGameStore((s) => s.board);
  const selected = useGameStore((s) => s.selected);
  const hints = useGameStore((s) => s.hints);
  const lastMove = useGameStore((s) => s.lastMove);
  const toMove = useGameStore((s) => s.toMove);
  const result = useGameStore((s) => s.result);
  const orientation = useGameStore((s) => s.orientation);
  const mode = useGameStore((s) => s.mode);
  const humanSide = useGameStore((s) => s.humanSide);
  const selectSquare = useGameStore((s) => s.selectSquare);
  const setAnimating = useGameStore((s) => s.setAnimating);

  const { boardSkin, pieceSkin, showHints, showCoords, sound: soundOn } =
    useSettings();

  const [boxRef, width] = useElementWidth<HTMLDivElement>();
  const framePad = Math.round(width * 0.035);
  const boardInner = Math.max(0, width - framePad * 2);
  const cell = boardInner / SIZE;

  const [cursor, setCursor] = React.useState<{ vr: number; vc: number } | null>(
    null,
  );
  const [shake, setShake] = React.useState<{ id: string; n: number } | null>(
    null,
  );
  const skin = SKINS[boardSkin];

  React.useEffect(() => {
    sound.setEnabled(soundOn);
  }, [soundOn]);

  // Fire feedback + release the input lock when a move settles.
  React.useEffect(() => {
    if (!lastMove) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (lastMove.captures.length > 0) {
      // One crunchy CHOMP per victim, timed as the attacker passes over it.
      lastMove.captures.forEach((_, i) => {
        timers.push(
          setTimeout(() => {
            sound.play("capture");
            haptic([12, 40, 18]);
          }, 90 + i * 210),
        );
      });
    } else {
      sound.play("move");
      haptic(12);
    }
    const dur = moveDurationMs(lastMove);
    if (lastMove.promote) {
      timers.push(
        setTimeout(() => {
          sound.play("king");
          haptic([8, 20, 8, 20]);
        }, dur * 0.66),
      );
    }
    timers.push(
      setTimeout(() => {
        setAnimating(false);
        onMoveSettled?.(lastMove);
      }, dur + 60),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMove]);

  const canInteract =
    interactive &&
    result.kind === "playing" &&
    (mode === "local" || toMove === humanSide);

  const handleSquare = React.useCallback(
    (pos: Pos) => {
      if (!canInteract) return;
      const st = useGameStore.getState();
      const piece = st.board[pos.row][pos.col];
      const isHint = st.selected && st.hints.some((m) => samePos(m.to, pos));
      const ownPiece = piece && piece.player === st.toMove;
      if (st.selected && !isHint && !ownPiece) {
        // Invalid target → shake the selected piece.
        const sel = st.board[st.selected.row][st.selected.col];
        if (sel) {
          sound.play("invalid");
          haptic(30);
          setShake({ id: sel.id, n: (shake?.n ?? 0) + 1 });
        }
        return;
      }
      if (ownPiece) {
        sound.play("select");
        haptic(8);
      }
      selectSquare(pos);
    },
    [canInteract, selectSquare, shake],
  );

  // Keyboard navigation
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!canInteract) return;
    const cur = cursor ?? { vr: orientation === "red" ? 5 : 2, vc: 3 };
    const move = (dvr: number, dvc: number) => {
      e.preventDefault();
      setCursor({
        vr: Math.max(0, Math.min(SIZE - 1, cur.vr + dvr)),
        vc: Math.max(0, Math.min(SIZE - 1, cur.vc + dvc)),
      });
    };
    switch (e.key) {
      case "ArrowUp":
        return move(-1, 0);
      case "ArrowDown":
        return move(1, 0);
      case "ArrowLeft":
        return move(0, -1);
      case "ArrowRight":
        return move(0, 1);
      case "Enter":
      case " ":
        e.preventDefault();
        return handleSquare(fromVisual(cur.vr, cur.vc, orientation));
    }
  };

  const pieces: { piece: NonNullable<(typeof board)[0][0]>; row: number; col: number }[] =
    [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      const p = board[r][c];
      if (p) pieces.push({ piece: p, row: r, col: c });
    }

  const moverId =
    lastMove && board[lastMove.to.row][lastMove.to.col]?.id;

  return (
    <div
      ref={boxRef}
      role="grid"
      aria-label="Checkers board"
      tabIndex={interactive ? 0 : -1}
      onKeyDown={onKeyDown}
      className="relative aspect-square w-full select-none rounded-[7%] shadow-[0_40px_80px_-40px_rgba(0,0,0,.7)] outline-none focus-visible:ring-focus"
      style={{ background: skin.frame, padding: framePad }}
    >
      {/* inner bevel */}
      <div
        className="pointer-events-none absolute rounded-[4%]"
        style={{
          inset: framePad * 0.45,
          boxShadow:
            "inset 0 2px 6px rgba(255,255,255,.12), inset 0 -6px 20px rgba(0,0,0,.45)",
        }}
      />

      {width > 0 && (
        <div
          className="relative overflow-hidden rounded-[2%]"
          style={{ width: boardInner, height: boardInner }}
        >
          {/* Squares */}
          {Array.from({ length: SIZE }).map((_, vr) =>
            Array.from({ length: SIZE }).map((__, vc) => {
              const dark = (vr + vc) % 2 === 1;
              const logical = fromVisual(vr, vc, orientation);
              const isSelected =
                selected && samePos(selected, logical);
              const hint = hints.find((m) => samePos(m.to, logical));
              const isLastFrom =
                lastMove && samePos(lastMove.from, logical);
              const isLastTo = lastMove && samePos(lastMove.to, logical);
              const isCursor = cursor && cursor.vr === vr && cursor.vc === vc;
              const captureHint = hint && hint.captures.length > 0;

              return (
                <button
                  key={`${vr}-${vc}`}
                  role="gridcell"
                  tabIndex={-1}
                  aria-label={`${String.fromCharCode(97 + vc)}${SIZE - vr}`}
                  onClick={() => handleSquare(logical)}
                  disabled={!dark || !canInteract}
                  className="absolute transition-[filter] duration-150"
                  style={{
                    left: vc * cell,
                    top: vr * cell,
                    width: cell,
                    height: cell,
                    background: dark ? skin.dark : skin.light,
                    cursor: dark && canInteract ? "pointer" : "default",
                  }}
                >
                  {/* texture */}
                  <span
                    className="pointer-events-none absolute inset-0"
                    style={{ background: dark ? skin.darkTx : skin.lightTx }}
                  />
                  {/* last move tint */}
                  {(isLastFrom || isLastTo) && (
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/25 to-brand-3/20" />
                  )}
                  {/* selected ring */}
                  {isSelected && (
                    <span className="pointer-events-none absolute inset-0 rounded-[6%] shadow-[inset_0_0_0_3px_rgb(var(--brand))]" />
                  )}
                  {/* keyboard cursor */}
                  {isCursor && (
                    <span className="pointer-events-none absolute inset-1 rounded-[10%] border-2 border-white/70" />
                  )}
                  {/* move hint */}
                  {hint && showHints && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      {captureHint ? (
                        <span
                          className="rounded-full border-2 border-bad/80 bg-bad/10 animate-pulse-hint"
                          style={{ width: cell * 0.82, height: cell * 0.82 }}
                        />
                      ) : (
                        <span
                          className="rounded-full bg-brand/70 animate-pulse-hint"
                          style={{ width: cell * 0.28, height: cell * 0.28 }}
                        />
                      )}
                    </span>
                  )}
                </button>
              );
            }),
          )}

          {/* Pieces */}
          <AnimatePresence>
            {pieces.map(({ piece, row, col }) => {
              const { vr, vc } = toVisual({ row, col }, orientation);
              const x = vc * cell;
              const y = vr * cell;
              const isMover = moverId === piece.id && !!lastMove;
              const justPromoted =
                isMover && !!lastMove?.promote && piece.king;
              const isSelected = selected && samePos(selected, { row, col });
              const isShaking = shake?.id === piece.id;

              let animate: Record<string, number | number[]> = { x, y };
              let transition: object = {
                type: "spring",
                stiffness: 420,
                damping: 34,
              };

              if (isMover) {
                const pts = lastMove!.path.map((p) => {
                  const v = toVisual(p, orientation);
                  return { x: v.vc * cell, y: v.vr * cell };
                });
                if (lastMove!.captures.length && pts.length >= 2) {
                  const xs: number[] = [pts[0].x];
                  const ys: number[] = [pts[0].y];
                  for (let i = 0; i < pts.length - 1; i++) {
                    const a = pts[i];
                    const b = pts[i + 1];
                    xs.push((a.x + b.x) / 2, b.x);
                    ys.push(Math.min(a.y, b.y) - cell * 0.55, b.y);
                  }
                  const times = xs.map((_, i) => i / (xs.length - 1));
                  animate = { x: xs, y: ys };
                  transition = {
                    duration: moveDurationMs(lastMove!) / 1000,
                    ease: "easeInOut",
                    times,
                  };
                } else {
                  transition = {
                    type: "spring",
                    stiffness: 380,
                    damping: 30,
                  };
                }
              }

              // Which capture index removes this piece → syncs its panic with
              // the jaws snapping shut above it.
              const capIdx = lastMove?.captures.findIndex((c) =>
                samePos(c, { row, col }),
              );
              const eatenDelay =
                capIdx !== undefined && capIdx >= 0 ? 0.09 + capIdx * 0.21 : 0.1;

              return (
                <motion.div
                  key={piece.id}
                  className="pointer-events-none absolute left-0 top-0"
                  style={{ width: cell, height: cell, zIndex: isMover ? 30 : 10 }}
                  initial={{ x, y, scale: 0, opacity: 0 }}
                  animate={{ ...animate, scale: 1, opacity: 1 }}
                  exit={{
                    // Panic puff → squashed flat between the jaws → gulped.
                    scaleX: [1, 1.16, 1.32, 0.4],
                    scaleY: [1, 1.16, 0.3, 0.04],
                    rotate: [0, -13, 10, -4],
                    opacity: [1, 1, 1, 0],
                    transition: {
                      duration: 0.44,
                      times: [0, 0.42, 0.75, 1],
                      delay: eatenDelay,
                      ease: "easeIn",
                    },
                  }}
                  transition={transition}
                >
                  {/* impact squash & stretch when landing a move */}
                  <motion.div
                    key={
                      isMover && lastMove
                        ? `${piece.id}-${lastMove.from.row}${lastMove.from.col}${lastMove.to.row}${lastMove.to.col}`
                        : piece.id
                    }
                    className="h-full w-full"
                    animate={
                      isMover
                        ? {
                            scaleY: [1, 1, 0.8, 1.08, 1],
                            scaleX: [1, 1, 1.18, 0.96, 1],
                          }
                        : undefined
                    }
                    transition={
                      isMover && lastMove
                        ? {
                            duration: moveDurationMs(lastMove) / 1000 + 0.18,
                            times: [0, 0.68, 0.8, 0.92, 1],
                          }
                        : undefined
                    }
                    style={{ transformOrigin: "50% 85%" }}
                  >
                    <motion.div
                      className="h-full w-full"
                      animate={
                        isShaking
                          ? { x: [0, -6, 6, -5, 5, 0] }
                          : isSelected
                            ? {
                                scale: [1.09, 1.13, 1.09],
                                rotate: [0, -2.5, 2.5, 0],
                              }
                            : { scale: 1, rotate: 0 }
                      }
                      transition={
                        isShaking
                          ? { duration: 0.4 }
                          : isSelected
                            ? { repeat: Infinity, duration: 0.9, ease: "easeInOut" }
                            : { type: "spring", stiffness: 400, damping: 22 }
                      }
                      style={{
                        filter: isSelected
                          ? "drop-shadow(0 12px 16px rgba(0,0,0,.45))"
                          : undefined,
                      }}
                    >
                      <PieceToken
                        piece={piece}
                        size={cell}
                        viewerSide={viewerSide}
                        justPromoted={justPromoted}
                        skin={pieceSkin}
                      />
                    </motion.div>
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Monster-bite capture FX */}
          {lastMove && lastMove.captures.length > 0 && (
            <CaptureFx
              key={`fx-${lastMove.from.row}-${lastMove.from.col}-${lastMove.to.row}-${lastMove.to.col}`}
              move={lastMove}
              orientation={orientation}
              cell={cell}
              victim={moverId ? OTHER[board[lastMove.to.row][lastMove.to.col]!.player] : "black"}
            />
          )}
        </div>
      )}

      {/* Coordinates */}
      {showCoords && width > 0 && <Coords orientation={orientation} pad={framePad} />}
    </div>
  );
}

const CHOMP_WORDS = ["CHOMP!", "NOM!", "CRUNCH!", "GULP!", "MUNCH!"];

const CRUMB_COLORS: Record<Player, string[]> = {
  red: ["#ff8585", "#e5484d", "#b01a2b", "#ffd0d0"],
  black: ["#4b5568", "#2b3040", "#141826", "#8b93a8"],
};

/**
 * A hungry pair of jaws snaps shut over each captured square, the victim is
 * squashed between rows of teeth, crumbs fly, and a comic CHOMP! pops out.
 */
function CaptureFx({
  move,
  orientation,
  cell,
  victim,
}: {
  move: Move;
  orientation: Player;
  cell: number;
  victim: Player;
}) {
  return (
    <>
      {move.captures.map((cap, i) => {
        const v = toVisual(cap, orientation);
        const delay = 0.09 + i * 0.21;
        const word = CHOMP_WORDS[(cap.row * 7 + cap.col * 3 + i) % CHOMP_WORDS.length];
        const crumbs = CRUMB_COLORS[victim];
        const jawH = cell * 0.62;
        const teeth = 5;
        const toothPts = (up: boolean) => {
          // Zig-zag polygon: rounded gum bar with triangular teeth.
          const w = 100;
          const t = 46;
          let pts = up ? `0,0 ${w},0 ` : `0,${t} `;
          for (let k = 0; k < teeth; k++) {
            const x0 = (k / teeth) * w;
            const x1 = ((k + 0.5) / teeth) * w;
            const x2 = ((k + 1) / teeth) * w;
            pts += up
              ? `${x2},${t * 0.45} ${x1},${t} ${x0},${t * 0.45} `
              : `${x0},${t * 0.55} ${x1},0 ${x2},${t * 0.55} `;
          }
          if (!up) pts += `${w},${t} `;
          return pts.trim();
        };

        return (
          <div
            key={`${cap.row}-${cap.col}`}
            className="pointer-events-none absolute z-40"
            style={{ left: v.vc * cell, top: v.vr * cell, width: cell, height: cell }}
          >
            {/* upper jaw */}
            <motion.svg
              viewBox="0 0 100 46"
              className="absolute left-1/2 w-[112%] -translate-x-1/2"
              style={{ height: jawH * 0.55, top: 0 }}
              initial={{ y: -jawH, opacity: 0, scale: 0.8 }}
              animate={{
                y: [-jawH, -jawH * 0.05, -jawH * 0.12, -jawH * 1.4],
                opacity: [0, 1, 1, 0],
                scale: [0.9, 1.06, 1, 0.9],
              }}
              transition={{ duration: 0.62, times: [0, 0.28, 0.66, 1], delay, ease: "easeIn" }}
            >
              <polygon points={toothPts(true)} fill="#f6f1e6" stroke="#c9bda5" strokeWidth="1.5" />
              <rect x="0" y="0" width="100" height="10" rx="5" fill="#7a4fd0" />
            </motion.svg>
            {/* lower jaw */}
            <motion.svg
              viewBox="0 0 100 46"
              className="absolute left-1/2 w-[112%] -translate-x-1/2"
              style={{ height: jawH * 0.55, bottom: 0 }}
              initial={{ y: jawH, opacity: 0, scale: 0.8 }}
              animate={{
                y: [jawH, jawH * 0.05, jawH * 0.12, jawH * 1.4],
                opacity: [0, 1, 1, 0],
                scale: [0.9, 1.06, 1, 0.9],
              }}
              transition={{ duration: 0.62, times: [0, 0.28, 0.66, 1], delay, ease: "easeIn" }}
            >
              <polygon points={toothPts(false)} fill="#f6f1e6" stroke="#c9bda5" strokeWidth="1.5" />
              <rect x="0" y="36" width="100" height="10" rx="5" fill="#5e3ba8" />
            </motion.svg>

            {/* crumbs burst as the jaws meet */}
            {Array.from({ length: 10 }).map((_, k) => {
              const angle = (k / 10) * Math.PI * 2 + (i % 3) * 0.4;
              const dist = cell * (0.4 + (k % 3) * 0.16);
              return (
                <motion.span
                  key={k}
                  className="absolute left-1/2 top-1/2"
                  style={{
                    width: cell * (0.06 + (k % 3) * 0.03),
                    height: cell * (0.06 + (k % 3) * 0.03),
                    background: crumbs[k % crumbs.length],
                    borderRadius: k % 2 ? "50%" : "20%",
                  }}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                  animate={{
                    x: Math.cos(angle) * dist,
                    y: Math.sin(angle) * dist - cell * 0.1,
                    opacity: [0, 1, 1, 0],
                    scale: [0, 1.2, 1, 0.3],
                    rotate: (k % 2 ? 1 : -1) * 220,
                  }}
                  transition={{ duration: 0.55, delay: delay + 0.16, ease: "easeOut" }}
                />
              );
            })}

            {/* comic CHOMP! pop */}
            <motion.div
              className="absolute left-1/2 top-0 z-50 -translate-x-1/2 whitespace-nowrap font-display font-extrabold"
              style={{
                fontSize: cell * 0.3,
                color: "#ffd76a",
                WebkitTextStroke: `${Math.max(1, cell * 0.018)}px #4a2d09`,
                textShadow: "0 3px 0 rgba(0,0,0,.35)",
                rotate: i % 2 ? -8 : 6,
              }}
              initial={{ scale: 0, y: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.35, 1, 0.9],
                y: [0, -cell * 0.42, -cell * 0.52, -cell * 0.72],
                opacity: [0, 1, 1, 0],
              }}
              transition={{ duration: 0.7, times: [0, 0.3, 0.7, 1], delay: delay + 0.12 }}
            >
              {word}
            </motion.div>
          </div>
        );
      })}
    </>
  );
}

function Coords({ orientation, pad }: { orientation: Player; pad: number }) {
  const files =
    orientation === "red"
      ? ["a", "b", "c", "d", "e", "f", "g", "h"]
      : ["h", "g", "f", "e", "d", "c", "b", "a"];
  const ranks =
    orientation === "red"
      ? [8, 7, 6, 5, 4, 3, 2, 1]
      : [1, 2, 3, 4, 5, 6, 7, 8];
  return (
    <div className="pointer-events-none absolute inset-0 text-[10px] font-medium text-white/45">
      <div
        className="absolute flex justify-around"
        style={{ left: pad, right: pad, bottom: pad * 0.18 }}
      >
        {files.map((f) => (
          <span key={f} className="w-0 text-center">
            {f}
          </span>
        ))}
      </div>
      <div
        className="absolute flex flex-col justify-around"
        style={{ top: pad, bottom: pad, left: pad * 0.28 }}
      >
        {ranks.map((r) => (
          <span key={r}>{r}</span>
        ))}
      </div>
    </div>
  );
}

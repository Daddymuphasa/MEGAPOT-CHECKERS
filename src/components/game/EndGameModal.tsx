"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, RotateCcw, Trophy, Handshake, Flag } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { GameResult, Player } from "@/lib/game/types";
import { celebrate } from "./confetti";
import { sound } from "@/lib/sound";
import { WinnersLuck } from "@/components/megapot/WinnersLuck";

const HANDSHAKE_DURATION = 2200;

interface EndGameModalProps {
  result: GameResult;
  perspective?: Player;
  redName?: string;
  blackName?: string;
  onRematch?: () => void;
  onHome?: () => void;
  children?: React.ReactNode;
}

export function EndGameModal({
  result,
  perspective,
  redName = "Red",
  blackName = "Black",
  onRematch,
  onHome,
  children,
}: EndGameModalProps) {
  const open = result.kind !== "playing";
  const isWin = result.kind === "win";
  const winner = isWin ? result.winner : null;
  const youWon = perspective && winner === perspective;
  const youLost = perspective && isWin && winner !== perspective;
  const [handshakeDone, setHandshakeDone] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setHandshakeDone(false);
      return;
    }
    const t = setTimeout(() => {
      setHandshakeDone(true);
      if (result.kind === "draw") {
        sound.play("notify");
      } else if (!perspective || youWon) {
        celebrate();
        sound.play("win");
      } else {
        sound.play("lose");
      }
    }, HANDSHAKE_DURATION);
    return () => clearTimeout(t);
  }, [open, result.kind, perspective, youWon]);

  const headline =
    result.kind === "draw"
      ? "It's a draw"
      : youWon
        ? "You win!"
        : youLost
          ? "You lost"
          : `${winner === "red" ? redName : blackName} wins!`;

  const reasonText =
    result.kind === "win"
      ? {
          "no-pieces": "All opponent pieces captured",
          "no-moves": "Opponent has no legal moves",
          resign: "Opponent resigned",
        }[result.reason]
      : result.kind === "draw"
        ? {
            inactivity: "No progress in 40 moves",
            agreement: "Draw by agreement",
          }[result.reason]
        : "";

  const Icon =
    result.kind === "draw" ? Handshake : youLost ? Flag : Trophy;

  return (
    <Modal open={open} dismissable={false} labelledBy="endgame-title">
      <div className="flex flex-col items-center text-center">
        {/* Handshake ceremony — plays first, then fades out */}
        <AnimatePresence>
          {!handshakeDone && open && <HandshakeAnimation />}
        </AnimatePresence>

        {/* Main content fades in after handshake */}
        <motion.div
          className="flex flex-col items-center text-center"
          initial={false}
          animate={{ opacity: handshakeDone ? 1 : 0, y: handshakeDone ? 0 : 20 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ pointerEvents: handshakeDone ? "auto" : "none" }}
        >
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={handshakeDone ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -30 }}
            transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
            className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl brand-gradient shadow-[0_20px_50px_-16px_rgb(124_92_246/.8)]"
          >
            <Icon className="h-10 w-10 text-white" strokeWidth={2} />
          </motion.div>

          <h2 id="endgame-title" className="font-display text-3xl font-bold">
            {headline}
          </h2>
          {reasonText && (
            <p className="mt-1 text-sm text-muted">{reasonText}</p>
          )}

          {children && <div className="mt-5 w-full">{children}</div>}

          {isWin && (!perspective || youWon) && (
            <div className="mt-5 w-full">
              <WinnersLuck />
            </div>
          )}

          <div className="mt-6 flex w-full gap-3">
            {onHome && (
              <Button variant="secondary" className="flex-1" onClick={onHome}>
                <Home className="h-4 w-4" />
                Home
              </Button>
            )}
            {onRematch && (
              <Button className="flex-1" onClick={onRematch}>
                <RotateCcw className="h-4 w-4" />
                Rematch
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </Modal>
  );
}

function HandshakeAnimation() {
  return (
    <motion.div
      className="flex flex-col items-center py-6"
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.35 }}
    >
      <div className="relative flex items-center justify-center" style={{ width: 180, height: 120 }}>
        {/* Left hand */}
        <motion.svg
          viewBox="0 0 80 80"
          width={72}
          height={72}
          className="absolute"
          style={{ left: 0, top: 20 }}
          initial={{ x: -60, rotate: -15, opacity: 0 }}
          animate={{ x: 0, rotate: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
        >
          <defs>
            <linearGradient id="handL" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c0a8b8" />
              <stop offset="50%" stopColor="#8a7080" />
              <stop offset="100%" stopColor="#b098a8" />
            </linearGradient>
          </defs>
          {/* Wrist/arm */}
          <rect x="0" y="28" width="35" height="18" rx="6" fill="url(#handL)" opacity="0.9" />
          {/* Palm */}
          <rect x="24" y="20" width="30" height="34" rx="8" fill="url(#handL)" />
          {/* Thumb */}
          <rect x="48" y="38" width="16" height="10" rx="5" fill="url(#handL)" />
          {/* Fingers */}
          <rect x="50" y="20" width="12" height="10" rx="5" fill="url(#handL)" opacity="0.95" />
          <rect x="52" y="28" width="14" height="9" rx="4.5" fill="url(#handL)" opacity="0.9" />
          {/* Metallic shine */}
          <ellipse cx="38" cy="30" rx="10" ry="6" fill="rgba(255,255,255,.18)" />
        </motion.svg>

        {/* Right hand */}
        <motion.svg
          viewBox="0 0 80 80"
          width={72}
          height={72}
          className="absolute"
          style={{ right: 0, top: 20 }}
          initial={{ x: 60, rotate: 15, opacity: 0 }}
          animate={{ x: 0, rotate: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
        >
          <defs>
            <linearGradient id="handR" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a0a8c0" />
              <stop offset="50%" stopColor="#606878" />
              <stop offset="100%" stopColor="#98a0b8" />
            </linearGradient>
          </defs>
          {/* Wrist/arm */}
          <rect x="45" y="28" width="35" height="18" rx="6" fill="url(#handR)" opacity="0.9" />
          {/* Palm */}
          <rect x="26" y="20" width="30" height="34" rx="8" fill="url(#handR)" />
          {/* Thumb */}
          <rect x="16" y="38" width="16" height="10" rx="5" fill="url(#handR)" />
          {/* Fingers */}
          <rect x="18" y="20" width="12" height="10" rx="5" fill="url(#handR)" opacity="0.95" />
          <rect x="14" y="28" width="14" height="9" rx="4.5" fill="url(#handR)" opacity="0.9" />
          {/* Metallic shine */}
          <ellipse cx="42" cy="30" rx="10" ry="6" fill="rgba(255,255,255,.18)" />
        </motion.svg>

        {/* Clasp glow — appears when hands meet */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 50,
            height: 50,
            left: "50%",
            top: "50%",
            marginLeft: -25,
            marginTop: -25,
            background: "radial-gradient(circle, rgba(124,92,246,.4) 0%, transparent 70%)",
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.6, 1.2], opacity: [0, 0.8, 0.5] }}
          transition={{ duration: 0.5, delay: 0.7, ease: "easeOut" }}
        />

        {/* Shake bounce after clasp */}
        <motion.div
          className="absolute inset-0"
          animate={{ y: [0, 0, -4, 4, -3, 2, 0] }}
          transition={{
            duration: 0.8,
            delay: 0.9,
            ease: "easeInOut",
            times: [0, 0.1, 0.3, 0.5, 0.7, 0.85, 1],
          }}
        />
      </div>

      {/* "Deal sealed" text */}
      <motion.p
        className="mt-2 text-sm font-semibold tracking-widest uppercase"
        style={{ color: "rgba(255,255,255,.5)" }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.4 }}
      >
        Deal sealed
      </motion.p>
    </motion.div>
  );
}

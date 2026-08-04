"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Home, RotateCcw, Trophy, Handshake, Flag } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { GameResult, Player } from "@/lib/game/types";
import { celebrate } from "./confetti";
import { sound } from "@/lib/sound";

interface EndGameModalProps {
  result: GameResult;
  /** Perspective for the headline. If omitted, neutral (local hot-seat). */
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

  React.useEffect(() => {
    if (!open) return;
    if (result.kind === "draw") {
      sound.play("notify");
      return;
    }
    if (!perspective || youWon) {
      celebrate();
      sound.play("win");
    } else {
      sound.play("lose");
    }
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
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
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
      </div>
    </Modal>
  );
}

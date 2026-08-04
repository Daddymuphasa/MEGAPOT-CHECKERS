"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Crown, Loader2 } from "lucide-react";
import type { Piece, Player } from "@/lib/game/types";
import { cn } from "@/lib/utils";

interface PlayerCardProps {
  side: Player;
  name: string;
  subtitle?: string;
  active: boolean;
  thinking?: boolean;
  /** Pieces this player has captured from the opponent. */
  captured: Piece[];
  align?: "left" | "right";
}

export function PlayerCard({
  side,
  name,
  subtitle,
  active,
  thinking,
  captured,
  align = "left",
}: PlayerCardProps) {
  const dotBg =
    side === "red"
      ? "linear-gradient(155deg,#ff6b6b,#b01a2b)"
      : "linear-gradient(155deg,#3b4252,#0e1220)";

  return (
    <motion.div
      layout
      className={cn(
        "glass relative flex items-center gap-3 rounded-2xl p-3 transition-shadow",
        active && "ring-2 ring-brand/60 shadow-[0_0_40px_-12px_rgb(124_92_246/.6)]",
        align === "right" && "flex-row-reverse text-right",
      )}
    >
      <div className="relative shrink-0">
        <div
          className="h-11 w-11 rounded-full border border-white/20 shadow-inner"
          style={{ background: dotBg }}
        />
        <AnimatePresence>
          {active && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-good ring-2 ring-bg"
            />
          )}
        </AnimatePresence>
      </div>

      <div className="min-w-0 flex-1">
        <div className={cn("flex items-center gap-1.5", align === "right" && "justify-end")}>
          <span className="truncate font-display font-semibold">{name}</span>
          {thinking && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
          )}
        </div>
        <div className="truncate text-xs text-muted">
          {thinking ? "Thinking…" : subtitle ?? (side === "red" ? "Red" : "Black")}
        </div>
      </div>

      {/* captured mini-tray */}
      <div className={cn("flex min-h-6 flex-wrap gap-0.5", align === "right" && "justify-end")}>
        <AnimatePresence mode="popLayout">
          {captured.map((p) => (
            <motion.span
              key={p.id}
              layout
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/20"
              style={{
                background:
                  p.player === "red"
                    ? "linear-gradient(155deg,#ff6b6b,#b01a2b)"
                    : "linear-gradient(155deg,#3b4252,#0e1220)",
              }}
            >
              {p.king && <Crown className="h-2 w-2" color="#ffd76a" />}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Crown, Lock, Shield, Zap, Skull } from "lucide-react";
import type { Piece, Player, PowerKind } from "@/lib/game/types";
import type { PieceSkin } from "@/store/settings-store";
import { cn } from "@/lib/utils";

const FACES: Record<Player, { base: string; ring: string; face: string; shadow: string }> = {
  red: {
    base: "linear-gradient(155deg,#ff6b6b 0%,#e5484d 42%,#b01a2b 100%)",
    ring: "linear-gradient(155deg,#ffb0b0,#8f1220)",
    face: "radial-gradient(circle at 38% 32%,rgba(255,255,255,.55),rgba(255,255,255,0) 46%)",
    shadow: "rgba(176,26,43,.55)",
  },
  black: {
    base: "linear-gradient(155deg,#3b4252 0%,#232838 45%,#0e1220 100%)",
    ring: "linear-gradient(155deg,#5b6478,#0a0d16)",
    face: "radial-gradient(circle at 38% 32%,rgba(255,255,255,.35),rgba(255,255,255,0) 46%)",
    shadow: "rgba(6,8,16,.6)",
  },
};

const POWER_META: Record<Exclude<PowerKind, "none">, { icon: typeof Shield; color: string; label: string }> = {
  shield: { icon: Shield, color: "#38e0fa", label: "Shield" },
  double: { icon: Zap, color: "#facc5a", label: "Double" },
  saboteur: { icon: Skull, color: "#f472b6", label: "Saboteur" },
};

interface PieceTokenProps {
  piece: Piece;
  size: number;
  /** Which side is looking at the board — controls hidden-power visibility. */
  viewerSide?: Player | "spectator";
  justPromoted?: boolean;
  skin?: PieceSkin;
  /** Idle breathing + blinking eyes. Disable for tiny trays/previews. */
  alive?: boolean;
}

/** Stable per-piece hash for desynchronised idle animation timings. */
function idHash(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function PieceToken({
  piece,
  size,
  viewerSide,
  justPromoted,
  skin = "classic",
  alive = true,
}: PieceTokenProps) {
  const f = FACES[piece.player];
  const inset = size * 0.11;
  const power = piece.power && piece.power !== "none" ? piece.power : null;
  const canSeePower =
    !!power &&
    (piece.powerRevealed || viewerSide === piece.player);
  const powerMeta = power ? POWER_META[power] : null;
  const h = idHash(piece.id);

  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      aria-label={`${piece.player} ${piece.king ? "king" : "man"}`}
      animate={alive ? { scale: [1, 1.022, 1] } : undefined}
      transition={
        alive
          ? {
              repeat: Infinity,
              duration: 2.4 + (h % 10) / 9,
              delay: (h % 15) / 10,
              ease: "easeInOut",
            }
          : undefined
      }
    >
      {/* drop shadow / seat */}
      <div
        className="absolute rounded-full"
        style={{
          inset: inset * 0.6,
          filter: "blur(6px)",
          background: f.shadow,
          transform: `translateY(${size * 0.06}px)`,
          opacity: 0.7,
        }}
      />
      {/* outer ring */}
      <div
        className="absolute rounded-full"
        style={{
          inset,
          background: f.ring,
          boxShadow: `0 ${size * 0.04}px ${size * 0.08}px ${f.shadow}`,
        }}
      />
      {/* body */}
      <div
        className="absolute rounded-full"
        style={{
          inset: inset * 1.7,
          background: f.base,
        }}
      >
        {/* ridged inner ring */}
        <div
          className="absolute rounded-full border"
          style={{
            inset: size * 0.06,
            borderColor: "rgba(255,255,255,.14)",
            borderWidth: Math.max(1, size * 0.012),
            boxShadow: skin === "gem"
              ? "inset 0 0 12px rgba(255,255,255,.2)"
              : "inset 0 2px 6px rgba(255,255,255,.18), inset 0 -3px 8px rgba(0,0,0,.35)",
            background:
              skin === "gem"
                ? "conic-gradient(from 210deg,rgba(255,255,255,.16),rgba(0,0,0,.18),rgba(255,255,255,.16),rgba(0,0,0,.18),rgba(255,255,255,.16))"
                : undefined,
          }}
        />
        {/* specular highlight */}
        <div
          className="absolute rounded-full"
          style={{ inset: 0, background: f.face }}
        />

        {/* Blinking eyes — every piece is a little creature */}
        {alive && size > 30 && (
          <div
            className="pointer-events-none absolute flex justify-center"
            style={{
              top: size * (piece.king || power ? 0.1 : 0.2),
              left: 0,
              right: 0,
              gap: size * 0.1,
            }}
          >
            {[0, 1].map((eye) => (
              <motion.span
                key={eye}
                className="relative rounded-full bg-white"
                style={{
                  width: size * 0.11,
                  height: size * 0.13,
                  boxShadow: "inset 0 -1px 2px rgba(0,0,0,.25)",
                }}
                animate={{ scaleY: [1, 1, 0.08, 1, 1] }}
                transition={{
                  repeat: Infinity,
                  duration: 3.2 + (h % 7) / 4,
                  delay: (h % 20) / 8,
                  times: [0, 0.9, 0.94, 0.98, 1],
                }}
              >
                <span
                  className="absolute rounded-full"
                  style={{
                    width: size * 0.055,
                    height: size * 0.06,
                    background: "#14161f",
                    left: eye === 0 ? "45%" : "20%",
                    top: "38%",
                  }}
                />
              </motion.span>
            ))}
          </div>
        )}

        {/* King crown */}
        <AnimatePresence>
          {piece.king && (
            <motion.div
              key="crown"
              initial={
                justPromoted
                  ? { scale: 0, rotate: -40, opacity: 0 }
                  : { scale: 1, opacity: 1 }
              }
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 14 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Crown
                style={{ width: size * 0.42, height: size * 0.42 }}
                className="drop-shadow-[0_1px_3px_rgba(0,0,0,.5)]"
                color="#ffd76a"
                fill="#f5b942"
                strokeWidth={1.5}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confidential power indicator (Inco mode) */}
        {power && !piece.king && (
          <div className="absolute inset-0 flex items-center justify-center">
            {canSeePower && powerMeta ? (
              <powerMeta.icon
                style={{ width: size * 0.34, height: size * 0.34 }}
                color={powerMeta.color}
                className={cn(
                  "drop-shadow-[0_1px_2px_rgba(0,0,0,.5)]",
                  piece.powerRevealed && "animate-pulse",
                )}
                strokeWidth={2}
              />
            ) : (
              <Lock
                style={{ width: size * 0.22, height: size * 0.22 }}
                className="opacity-40"
                color="#ffffff"
              />
            )}
          </div>
        )}
      </div>

      {/* Promotion sparkles */}
      <AnimatePresence>
        {justPromoted && <Sparkles size={size} />}
      </AnimatePresence>
    </motion.div>
  );
}

function Sparkles({ size }: { size: number }) {
  const count = 8;
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const dist = size * 0.55;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: size * 0.09,
              height: size * 0.09,
              background: i % 2 ? "#ffd76a" : "#fff",
              boxShadow: "0 0 8px #ffd76a",
            }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              scale: [0, 1.2, 0],
              opacity: [1, 1, 0],
            }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
          />
        );
      })}
    </div>
  );
}

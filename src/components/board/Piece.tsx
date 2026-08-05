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

const CHROME_FACES: Record<Player, {
  body: string;
  ring: string;
  highlight: string;
  innerRing: string;
  shadow: string;
  edgeGlow: string;
}> = {
  red: {
    body: "linear-gradient(155deg, #c8b0b0 0%, #9a7878 25%, #6b4848 50%, #8a6060 75%, #c0a0a0 100%)",
    ring: "linear-gradient(155deg, #e0c8c8, #6b3838, #d4b0b0)",
    highlight: "radial-gradient(ellipse 60% 40% at 35% 28%, rgba(255,220,220,.5), transparent)",
    innerRing: "conic-gradient(from 200deg, rgba(255,200,200,.2), rgba(100,40,40,.3), rgba(255,200,200,.2), rgba(100,40,40,.3), rgba(255,200,200,.2))",
    shadow: "rgba(120,40,40,.5)",
    edgeGlow: "rgba(255,180,180,.15)",
  },
  black: {
    body: "linear-gradient(155deg, #a0a8b8 0%, #707888 25%, #404858 50%, #606878 75%, #98a0b0 100%)",
    ring: "linear-gradient(155deg, #c0c8d8, #303848, #b0b8c8)",
    highlight: "radial-gradient(ellipse 60% 40% at 35% 28%, rgba(200,210,240,.45), transparent)",
    innerRing: "conic-gradient(from 200deg, rgba(200,210,240,.18), rgba(40,50,70,.25), rgba(200,210,240,.18), rgba(40,50,70,.25), rgba(200,210,240,.18))",
    shadow: "rgba(20,25,40,.6)",
    edgeGlow: "rgba(160,180,220,.12)",
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
  viewerSide?: Player | "spectator";
  justPromoted?: boolean;
  skin?: PieceSkin;
  alive?: boolean;
}

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
  const isChrome = skin === "chrome";
  const f = FACES[piece.player];
  const cf = CHROME_FACES[piece.player];
  const inset = size * 0.11;
  const power = piece.power && piece.power !== "none" ? piece.power : null;
  const canSeePower =
    !!power &&
    (piece.powerRevealed || viewerSide === piece.player);
  const powerMeta = power ? POWER_META[power] : null;
  const h = idHash(piece.id);

  if (isChrome) {
    return (
      <motion.div
        className="relative"
        style={{ width: size, height: size }}
        aria-label={`${piece.player} ${piece.king ? "king" : "man"}`}
        animate={alive ? { scale: [1, 1.015, 1] } : undefined}
        transition={
          alive
            ? {
                repeat: Infinity,
                duration: 2.8 + (h % 10) / 9,
                delay: (h % 15) / 10,
                ease: "easeInOut",
              }
            : undefined
        }
      >
        {/* Drop shadow */}
        <div
          className="absolute rounded-full"
          style={{
            inset: inset * 0.6,
            filter: "blur(8px)",
            background: cf.shadow,
            transform: `translateY(${size * 0.06}px)`,
            opacity: 0.6,
          }}
        />
        {/* Outer chrome ring */}
        <div
          className="absolute rounded-full"
          style={{
            inset,
            background: cf.ring,
            boxShadow: `0 ${size * 0.04}px ${size * 0.1}px ${cf.shadow}, 0 0 ${size * 0.15}px ${cf.edgeGlow}`,
          }}
        />
        {/* Edge reflection line */}
        <div
          className="absolute rounded-full"
          style={{
            inset: inset + 1,
            border: `1px solid ${cf.edgeGlow}`,
            background: "transparent",
          }}
        />
        {/* Main chrome body */}
        <div
          className="absolute rounded-full"
          style={{
            inset: inset * 1.7,
            background: cf.body,
          }}
        >
          {/* Conic metallic inner ring */}
          <div
            className="absolute rounded-full"
            style={{
              inset: size * 0.05,
              border: `${Math.max(1, size * 0.015)}px solid rgba(255,255,255,.1)`,
              background: cf.innerRing,
              boxShadow: "inset 0 0 8px rgba(255,255,255,.1), inset 0 -2px 6px rgba(0,0,0,.3)",
            }}
          />
          {/* Specular highlight — the liquid metal shine */}
          <div
            className="absolute rounded-full"
            style={{
              inset: 0,
              background: cf.highlight,
            }}
          />
          {/* Secondary bottom reflection */}
          <div
            className="absolute rounded-full"
            style={{
              inset: 0,
              background: "radial-gradient(ellipse 50% 30% at 60% 78%, rgba(255,255,255,.12), transparent)",
            }}
          />

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
                  className="drop-shadow-[0_2px_4px_rgba(0,0,0,.6)]"
                  color="#e8d8a0"
                  fill="url(#crownGrad)"
                  strokeWidth={1.5}
                />
                <svg width={0} height={0} className="absolute">
                  <defs>
                    <linearGradient id="crownGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f0e0a0" />
                      <stop offset="50%" stopColor="#c8a850" />
                      <stop offset="100%" stopColor="#f0d890" />
                    </linearGradient>
                  </defs>
                </svg>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Confidential power indicator */}
          {power && !piece.king && (
            <div className="absolute inset-0 flex items-center justify-center">
              {canSeePower && powerMeta ? (
                <powerMeta.icon
                  style={{ width: size * 0.34, height: size * 0.34 }}
                  color={powerMeta.color}
                  className={cn(
                    "drop-shadow-[0_1px_3px_rgba(0,0,0,.6)]",
                    piece.powerRevealed && "animate-pulse",
                  )}
                  strokeWidth={2}
                />
              ) : (
                <Lock
                  style={{ width: size * 0.22, height: size * 0.22 }}
                  className="opacity-30"
                  color="#c0c8d8"
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

  // Classic / gem / modern skins
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

        {/* Blinking eyes */}
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

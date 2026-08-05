"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Play, Zap, Brain, Shuffle, Ticket, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import type { Difficulty, Player } from "@/lib/game/types";
import { useWagerStore } from "@/lib/megapot/wager-store";
import { cn } from "@/lib/utils";

export interface AiConfig {
  difficulty: Difficulty;
  side: Player;
  wager: number;
}

const WAGER_OPTIONS = [0, 1, 2, 5, 10] as const;

export function AiSetup({ onStart }: { onStart: (c: AiConfig) => void }) {
  const [difficulty, setDifficulty] = React.useState<Difficulty>("hard");
  const [side, setSide] = React.useState<Player | "random">("red");
  const [wager, setWager] = React.useState(0);
  const bankroll = useWagerStore((s) => s.bankroll);
  const topUp = useWagerStore((s) => s.topUp);

  const effectiveWager = difficulty === "hard" ? wager : 0;

  const start = () => {
    const resolved: Player =
      side === "random" ? (Math.random() < 0.5 ? "red" : "black") : side;
    onStart({ difficulty, side: resolved, wager: effectiveWager });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 140, damping: 18 }}
      className="w-full max-w-lg"
    >
      <h1 className="mb-8 text-center font-display text-3xl font-black tracking-tight sm:text-4xl">
        <span className="text-chrome animate-neon-pulse">CHOOSE YOUR BATTLE</span>
      </h1>

      {/* Easy / Hard cards */}
      <div className="grid grid-cols-2 gap-4">
        <DifficultyCard
          active={difficulty === "easy"}
          onClick={() => setDifficulty("easy")}
          label="EASY"
          icon={<Zap className="h-6 w-6" />}
          tint="rgba(34, 211, 238, 0.15)"
          glowColor="rgba(34, 211, 238, 0.4)"
          delay={0}
        />
        <DifficultyCard
          active={difficulty === "hard"}
          onClick={() => setDifficulty("hard")}
          label="HARD"
          icon={<Brain className="h-6 w-6" />}
          tint="rgba(124, 92, 246, 0.15)"
          glowColor="rgba(124, 92, 246, 0.4)"
          delay={0.05}
        />
      </div>

      {/* Side picker */}
      <div className="mt-6">
        <label className="mb-2 block text-center text-sm font-medium text-muted">
          You play as
        </label>
        <Segmented<Player | "random">
          layoutId="ai-side"
          className="w-full"
          value={side}
          onChange={setSide}
          options={[
            {
              value: "red",
              label: "Red",
              icon: <Dot color="linear-gradient(155deg,#ff6b6b,#b01a2b)" />,
            },
            {
              value: "black",
              label: "Black",
              icon: <Dot color="linear-gradient(155deg,#3b4252,#0e1220)" />,
            },
            {
              value: "random",
              label: "Random",
              icon: <Shuffle className="h-3.5 w-3.5" />,
            },
          ]}
        />
      </div>

      {/* Wager section */}
      <div className="mt-6 glass-pill rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Coins className="h-4 w-4 text-gold" />
            Entry ticket
          </span>
          <span className="text-xs text-muted">
            Bankroll ${bankroll}
            {bankroll < 1 && (
              <button
                onClick={topUp}
                className="ml-1 font-medium text-brand hover:underline"
              >
                +$10
              </button>
            )}
          </span>
        </div>
        {difficulty === "hard" ? (
          <>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {WAGER_OPTIONS.map((w) => (
                <button
                  key={w}
                  disabled={w > bankroll}
                  onClick={() => setWager(w)}
                  className={cn(
                    "rounded-full border py-2 text-sm font-semibold tabular-nums transition-all disabled:opacity-40",
                    wager === w
                      ? "border-gold/60 bg-gold/10 text-gold shadow-[0_0_24px_-12px_rgba(245,194,66,.9)]"
                      : "border-white/10 bg-white/5 hover:border-white/20",
                  )}
                >
                  {w === 0 ? "Free" : `$${w}`}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              {wager > 0
                ? `You and the AI each stake $${wager} — winner takes $${wager * 2}.`
                : "Pick a ticket to put a pot on the line."}
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs text-muted">
            Wagers unlock on <span className="text-white">Hard</span> mode.
          </p>
        )}
      </div>

      {/* Start button */}
      <Button
        size="lg"
        variant={effectiveWager > 0 ? "gold" : "primary"}
        className="mt-6 w-full"
        onClick={start}
      >
        {effectiveWager > 0 ? (
          <>
            <Ticket className="h-5 w-5" />
            Buy ${effectiveWager} ticket & play for ${effectiveWager * 2}
          </>
        ) : (
          <>
            <Play className="h-5 w-5" />
            Start match
          </>
        )}
      </Button>
    </motion.div>
  );
}

function DifficultyCard({
  active,
  onClick,
  label,
  icon,
  tint,
  glowColor,
  delay,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  tint: string;
  glowColor: string;
  delay: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 120 }}
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "glass-hero relative flex aspect-[3/4] flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl p-6 transition-all",
        active
          ? "border-white/25 shadow-[0_0_50px_-10px_var(--glow)]"
          : "opacity-50 hover:opacity-75",
      )}
      style={{
        "--glow": glowColor,
        background: active ? tint : undefined,
      } as React.CSSProperties}
    >
      {/* Bottom glow */}
      {active && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-40"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 50% 90%, ${glowColor}, transparent)`,
          }}
        />
      )}

      {/* Shimmer on active */}
      {active && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div
            className="absolute inset-y-0 w-1/3 opacity-[0.08]"
            style={{
              background: "linear-gradient(90deg, transparent, white, transparent)",
              animation: "shimmer-sweep 3s ease-in-out infinite",
            }}
          />
        </div>
      )}

      {/* Floating energy particles */}
      {active && (
        <div className="pointer-events-none absolute inset-0">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 3 + i,
                height: 3 + i,
                left: `${20 + i * 18}%`,
                bottom: "20%",
                background: glowColor.replace("0.4", "0.8"),
                boxShadow: `0 0 6px ${glowColor}`,
              }}
              animate={{
                y: [0, -60 - i * 15, -80],
                opacity: [0, 1, 0],
                x: [0, (i % 2 ? 10 : -10)],
              }}
              transition={{
                repeat: Infinity,
                duration: 2 + i * 0.3,
                delay: i * 0.5,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      )}

      <span className="relative font-display text-3xl font-black tracking-wider text-chrome sm:text-4xl">
        {label}
      </span>

      <div
        className={cn(
          "relative flex h-16 w-16 items-center justify-center rounded-full transition-all",
          active
            ? "bg-white/10 shadow-[0_0_30px_-8px_var(--glow)]"
            : "bg-white/5",
        )}
        style={{ "--glow": glowColor } as React.CSSProperties}
      >
        {active && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: `2px solid ${glowColor.replace("0.4", "0.3")}` }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          />
        )}
        {icon}
      </div>

      {/* Label badge */}
      <span
        className={cn(
          "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-all",
          active ? "opacity-100" : "opacity-0",
        )}
        style={{
          background: glowColor.replace("0.4", "0.15"),
          color: glowColor.replace("0.4", "1"),
        }}
      >
        {label === "EASY" ? "Quick match" : "Full stakes"}
      </span>
    </motion.button>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="h-3 w-3 rounded-full border border-white/20"
      style={{ background: color }}
    />
  );
}

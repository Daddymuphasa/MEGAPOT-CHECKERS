"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Bot, Zap, Brain, Shuffle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import type { Difficulty, Player } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export interface AiConfig {
  difficulty: Difficulty;
  side: Player;
}

export function AiSetup({ onStart }: { onStart: (c: AiConfig) => void }) {
  const [difficulty, setDifficulty] = React.useState<Difficulty>("hard");
  const [side, setSide] = React.useState<Player | "random">("red");

  const start = () => {
    const resolved: Player =
      side === "random" ? (Math.random() < 0.5 ? "red" : "black") : side;
    onStart({ difficulty, side: resolved });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 140, damping: 18 }}
      className="w-full max-w-md"
    >
      <Card className="p-7">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl brand-gradient text-white shadow-lg">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Play vs AI</h1>
            <p className="text-sm text-muted">Minimax + alpha-beta engine</p>
          </div>
        </div>

        <label className="mb-2 block text-sm font-medium text-muted">
          Difficulty
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              {
                v: "easy",
                icon: Zap,
                name: "Easy",
                desc: "Depth 3 · makes mistakes",
              },
              {
                v: "hard",
                icon: Brain,
                name: "Hard",
                desc: "Depth 7 · plays sharp",
              },
            ] as const
          ).map(({ v, icon: Icon, name, desc }) => (
            <button
              key={v}
              onClick={() => setDifficulty(v)}
              className={cn(
                "rounded-xl border p-4 text-left transition-all",
                difficulty === v
                  ? "border-brand/60 bg-brand/10 shadow-[0_0_30px_-14px_rgb(124_92_246/.9)]"
                  : "border-border bg-surface-2/40 hover:border-border/80",
              )}
            >
              <Icon
                className={cn(
                  "mb-2 h-5 w-5",
                  difficulty === v ? "text-brand" : "text-muted",
                )}
              />
              <div className="font-display font-semibold">{name}</div>
              <div className="text-xs text-muted">{desc}</div>
            </button>
          ))}
        </div>

        <label className="mb-2 mt-6 block text-sm font-medium text-muted">
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
        <p className="mt-2 text-xs text-muted">
          Red always moves first.
        </p>

        <Button size="lg" className="mt-7 w-full" onClick={start}>
          Start match
        </Button>
      </Card>
    </motion.div>
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

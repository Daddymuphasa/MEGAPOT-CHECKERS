"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Bot } from "lucide-react";
import { Board } from "@/components/board/Board";
import { GameLayout } from "@/components/game/GameLayout";
import { PlayerCard } from "@/components/game/PlayerCard";
import { GameControls } from "@/components/game/GameControls";
import { EndGameModal } from "@/components/game/EndGameModal";
import { AiSetup, type AiConfig } from "@/components/game/AiSetup";
import { Card } from "@/components/ui/card";
import { AuroraBackground } from "@/components/layout/AuroraBackground";
import { TopBar } from "@/components/layout/TopBar";
import { useGameStore } from "@/store/game-store";
import { getAI } from "@/lib/ai";
import { OTHER, type Player } from "@/lib/game/types";

export default function AiPlayPage() {
  const router = useRouter();
  const [phase, setPhase] = React.useState<"setup" | "playing">("setup");
  const [cfg, setCfg] = React.useState<AiConfig | null>(null);

  const newGame = useGameStore((s) => s.newGame);
  const commitMove = useGameStore((s) => s.commitMove);
  const setAiThinking = useGameStore((s) => s.setAiThinking);
  const restart = useGameStore((s) => s.restart);
  const toMove = useGameStore((s) => s.toMove);
  const animating = useGameStore((s) => s.animating);
  const resultKind = useGameStore((s) => s.result.kind);
  const result = useGameStore((s) => s.result);
  const captured = useGameStore((s) => s.captured);
  const aiThinking = useGameStore((s) => s.aiThinking);

  const humanSide: Player = cfg?.side ?? "red";
  const aiSide = OTHER[humanSide];
  const busy = React.useRef(false);

  const start = (c: AiConfig) => {
    setCfg(c);
    newGame({
      mode: "ai",
      vsAI: true,
      difficulty: c.difficulty,
      humanSide: c.side,
      orientation: c.side,
      withPowers: false,
      allowUndo: true,
    });
    setPhase("playing");
  };

  // AI turn orchestration.
  React.useEffect(() => {
    if (phase !== "playing" || !cfg) return;
    if (resultKind !== "playing") return;
    if (toMove !== aiSide || animating || busy.current) return;

    busy.current = true;
    setAiThinking(true);
    const st = useGameStore.getState();
    getAI()
      .think(st.board, aiSide, cfg.difficulty, st.rules)
      .then(({ move }) => {
        setAiThinking(false);
        busy.current = false;
        if (move && useGameStore.getState().result.kind === "playing") {
          commitMove(move);
        }
      })
      .catch(() => {
        setAiThinking(false);
        busy.current = false;
      });
  }, [phase, cfg, toMove, animating, resultKind, aiSide, commitMove, setAiThinking]);

  React.useEffect(() => () => getAI().dispose(), []);

  if (phase === "setup") {
    return (
      <main className="relative flex min-h-dvh flex-col">
        <AuroraBackground />
        <TopBar title="Play vs AI" />
        <div className="flex flex-1 items-center justify-center p-4">
          <AiSetup onStart={start} />
        </div>
      </main>
    );
  }

  const humanCard = (
    <PlayerCard
      side={humanSide}
      name="You"
      active={toMove === humanSide}
      captured={captured[humanSide]}
    />
  );
  const aiCard = (
    <PlayerCard
      side={aiSide}
      name="Megapot AI"
      subtitle={`${cfg?.difficulty === "hard" ? "Hard" : "Easy"} · ${aiSide === "red" ? "Red" : "Black"}`}
      active={toMove === aiSide}
      thinking={aiThinking}
      captured={captured[aiSide]}
      align="right"
    />
  );

  // Human is always at the bottom (orientation follows humanSide).
  const topCard = aiCard;
  const bottomCard = humanCard;

  return (
    <>
      <GameLayout
        title="Play vs AI"
        topPlayer={topCard}
        bottomPlayer={bottomCard}
        board={<Board interactive />}
        side={
          <>
            <Card>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl brand-gradient text-white">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-display font-semibold">Megapot AI</div>
                  <div className="text-xs text-muted">
                    {cfg?.difficulty === "hard"
                      ? "Hard · searching 7 plies deep"
                      : "Easy · quick & beatable"}
                  </div>
                </div>
                <AnimatePresence>
                  {aiThinking && (
                    <span className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-2 w-2 animate-pulse-hint rounded-full bg-brand"
                          style={{ animationDelay: `${i * 0.2}s` }}
                        />
                      ))}
                    </span>
                  )}
                </AnimatePresence>
              </div>
            </Card>

            <Card>
              <h3 className="mb-3 font-display font-semibold">Controls</h3>
              <GameControls />
            </Card>
          </>
        }
      />

      <EndGameModal
        result={result}
        perspective={humanSide}
        onRematch={restart}
        onHome={() => router.push("/")}
      />
    </>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { RefreshCw, Crown, Bluetooth } from "lucide-react";
import { Board } from "@/components/board/Board";
import { GameLayout } from "@/components/game/GameLayout";
import { PlayerCard } from "@/components/game/PlayerCard";
import { GameControls } from "@/components/game/GameControls";
import { EndGameModal } from "@/components/game/EndGameModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useGameStore } from "@/store/game-store";

export default function LocalPlayPage() {
  const router = useRouter();
  const newGame = useGameStore((s) => s.newGame);
  const restart = useGameStore((s) => s.restart);
  const toMove = useGameStore((s) => s.toMove);
  const orientation = useGameStore((s) => s.orientation);
  const captured = useGameStore((s) => s.captured);
  const result = useGameStore((s) => s.result);
  const moveNumber = useGameStore((s) => s.moveNumber);
  const flyingKings = useGameStore((s) => s.rules.flyingKings);
  const setRules = useGameStore((s) => s.setRules);

  React.useEffect(() => {
    newGame({
      mode: "local",
      vsAI: false,
      humanSide: "red",
      orientation: "red",
      withPowers: false,
      allowUndo: true,
    });
  }, [newGame]);

  const redCard = (
    <PlayerCard
      side="red"
      name="Player 1"
      subtitle="Red"
      active={toMove === "red"}
      captured={captured.red}
    />
  );
  const blackCard = (
    <PlayerCard
      side="black"
      name="Player 2"
      subtitle="Black"
      active={toMove === "black"}
      captured={captured.black}
      align="right"
    />
  );

  const bottomSide = orientation;
  const topCard = bottomSide === "red" ? blackCard : redCard;
  const bottomCard = bottomSide === "red" ? redCard : blackCard;

  return (
    <>
      <GameLayout
        title="Local Match"
        topPlayer={topCard}
        bottomPlayer={bottomCard}
        board={<Board />}
        side={
          <>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted">
                    Move
                  </div>
                  <div className="font-display text-2xl font-bold">
                    {Math.ceil(moveNumber / 2)}
                  </div>
                </div>
                <motion.div
                  key={toMove}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-2 rounded-full border border-border bg-surface-2/60 px-3 py-1.5"
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{
                      background:
                        toMove === "red"
                          ? "linear-gradient(155deg,#ff6b6b,#b01a2b)"
                          : "linear-gradient(155deg,#3b4252,#0e1220)",
                    }}
                  />
                  <span className="text-sm font-medium">
                    {toMove === "red" ? "Red" : "Black"} to move
                  </span>
                </motion.div>
              </div>
            </Card>

            <Card>
              <h3 className="mb-1 font-display font-semibold">Controls</h3>
              <p className="mb-3 text-xs text-muted">
                Pass & play on one device. Tap a piece, then a highlighted
                square.
              </p>
              <GameControls />
              <div className="mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    useGameStore.setState({
                      orientation: orientation === "red" ? "black" : "red",
                    })
                  }
                >
                  <RefreshCw className="h-4 w-4" />
                  Flip board
                </Button>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-gold" />
                  <div>
                    <div className="text-sm font-medium">Flying kings</div>
                    <div className="text-xs text-muted">
                      Long-range kings (international)
                    </div>
                  </div>
                </div>
                <Switch
                  checked={flyingKings}
                  onChange={(v) => {
                    setRules({ flyingKings: v });
                    restart();
                  }}
                />
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2">
                <Bluetooth className="h-4 w-4 text-brand-3" />
                <h3 className="font-display font-semibold">Two devices?</h3>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                Pair a second phone or laptop with a QR code — each player gets
                their own board, synced in real time.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => router.push("/play/online?pair=1")}
              >
                Pair via QR / nearby
              </Button>
            </Card>
          </>
        }
      />

      <EndGameModal
        result={result}
        redName="Player 1"
        blackName="Player 2"
        onRematch={restart}
        onHome={() => router.push("/")}
      />
    </>
  );
}

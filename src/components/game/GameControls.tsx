"use client";

import * as React from "react";
import { Undo2, RotateCcw, Flag, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useGameStore } from "@/store/game-store";

interface GameControlsProps {
  showUndo?: boolean;
  showDraw?: boolean;
  onResignSide?: () => void;
}

export function GameControls({
  showUndo = true,
  showDraw = true,
  onResignSide,
}: GameControlsProps) {
  const undo = useGameStore((s) => s.undo);
  const restart = useGameStore((s) => s.restart);
  const resign = useGameStore((s) => s.resign);
  const agreeDraw = useGameStore((s) => s.agreeDraw);
  const canUndo = useGameStore((s) => s.history.length > 0 && s.allowUndo);
  const toMove = useGameStore((s) => s.toMove);
  const humanSide = useGameStore((s) => s.humanSide);
  const mode = useGameStore((s) => s.mode);
  const playing = useGameStore((s) => s.result.kind === "playing");

  const [confirm, setConfirm] = React.useState<null | "resign" | "restart">(null);

  const resignSide = mode === "local" ? toMove : humanSide;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {showUndo && (
          <Button
            variant="secondary"
            size="sm"
            disabled={!canUndo || !playing}
            onClick={undo}
          >
            <Undo2 className="h-4 w-4" />
            Undo
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => setConfirm("restart")}>
          <RotateCcw className="h-4 w-4" />
          Restart
        </Button>
        {showDraw && (
          <Button
            variant="ghost"
            size="sm"
            disabled={!playing}
            onClick={agreeDraw}
          >
            <Handshake className="h-4 w-4" />
            Draw
          </Button>
        )}
        <Button
          variant="danger"
          size="sm"
          disabled={!playing}
          onClick={() => setConfirm("resign")}
        >
          <Flag className="h-4 w-4" />
          Resign
        </Button>
      </div>

      <Modal open={confirm !== null} onClose={() => setConfirm(null)}>
        <h3 className="font-display text-xl font-semibold">
          {confirm === "resign" ? "Resign the game?" : "Restart the game?"}
        </h3>
        <p className="mt-2 text-sm text-muted">
          {confirm === "resign"
            ? "Your opponent will be awarded the win."
            : "The current game will be reset to the starting position."}
        </p>
        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setConfirm(null)}
          >
            Cancel
          </Button>
          <Button
            variant={confirm === "resign" ? "danger" : "primary"}
            className="flex-1"
            onClick={() => {
              if (confirm === "resign") {
                if (onResignSide) onResignSide();
                else resign(resignSide);
              } else {
                restart();
              }
              setConfirm(null);
            }}
          >
            {confirm === "resign" ? "Resign" : "Restart"}
          </Button>
        </div>
      </Modal>
    </>
  );
}

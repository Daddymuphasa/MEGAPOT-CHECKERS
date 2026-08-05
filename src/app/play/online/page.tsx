"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Loader2,
  Wifi,
  WifiOff,
  Lock,
  Sparkles,
  ExternalLink,
  Coins,
} from "lucide-react";
import { useAccount, useWalletClient } from "wagmi";
import { Board } from "@/components/board/Board";
import { GameLayout } from "@/components/game/GameLayout";
import { PlayerCard } from "@/components/game/PlayerCard";
import { GameControls } from "@/components/game/GameControls";
import { EndGameModal } from "@/components/game/EndGameModal";
import { AuroraBackground } from "@/components/layout/AuroraBackground";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lobby, CopyCode, type LobbyResult } from "@/components/online/Lobby";
import { PairPanel } from "@/components/local/PairPanel";
import { Web3Provider } from "@/components/online/Web3Provider";
import { useOnlineGame } from "@/lib/net/useOnlineGame";
import { useGameStore } from "@/store/game-store";
import { useWagerStore } from "@/lib/megapot/wager-store";
import { incoConfig } from "@/lib/inco/config";
import { OTHER } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export default function OnlinePage() {
  return (
    <Web3Provider>
      <React.Suspense fallback={null}>
        <OnlineInner />
      </React.Suspense>
    </Web3Provider>
  );
}

function OnlineInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkCode = searchParams.get("code");
  const pairMode = searchParams.get("pair") === "1";
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { state, create, join, commit, reportWinner, revealStakes, leave, escrowLive } =
    useOnlineGame(walletClient);

  const result = useGameStore((s) => s.result);
  const toMove = useGameStore((s) => s.toMove);
  const captured = useGameStore((s) => s.captured);
  const resign = useGameStore((s) => s.resign);

  const wagerOutcome = useWagerStore((s) => s.outcome);

  // When the game ends in online mode, report the winner, settle the pot
  // locally, and reveal + settle with Inco — all automatic, no buttons.
  const reported = React.useRef(false);
  React.useEffect(() => {
    if (state.phase !== "playing" || result.kind === "playing" || reported.current)
      return;
    reported.current = true;
    reportWinner(result.kind === "win" ? result.winner : "draw");
    if (state.stakeUsd > 0) {
      useWagerStore
        .getState()
        .settle(
          result.kind === "draw"
            ? "draw"
            : result.kind === "win" && result.winner === state.mySide
              ? "win"
              : "lose",
        );
    }
    revealStakes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.kind, state.phase]);

  // Match setup is fully automatic — stakes and hidden powers are sealed
  // behind the scenes the moment both players are in the room.
  React.useEffect(() => {
    if (state.phase === "committing" && !state.myCommitted && !state.busy) {
      commit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.myCommitted, state.busy]);

  const onLobby = (r: LobbyResult) => {
    if (r.action === "create") {
      create({
        name: r.name,
        withPowers: r.withPowers,
        stakeUsd: r.stakeUsd,
        address,
      });
    } else if (r.code) {
      join({ code: r.code, name: r.name, address });
    }
  };

  /* ------------------------- phases ------------------------- */

  if (state.phase === "lobby") {
    return (
      <Shell>
        <Lobby
          onSubmit={onLobby}
          busy={state.busy}
          error={state.error}
          initialCode={deepLinkCode}
          pairMode={pairMode}
        />
      </Shell>
    );
  }

  if (state.phase === "waiting") {
    const joinUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/play/online?code=${state.code}`
        : null;
    return (
      <Shell>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-4"
        >
          <Card className="p-8 text-center">
            <h2 className="font-display text-2xl font-bold">Room created</h2>
            <p className="mt-1 text-sm text-muted">
              Share this code with your opponent
            </p>
            <div className="mt-5">
              <CopyCode code={state.code} />
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted">
              {state.connected ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-good" /> Live · waiting for
                  opponent…
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-warn" /> Connecting…
                </>
              )}
            </div>
            <Button variant="ghost" className="mt-4" onClick={leave}>
              Cancel
            </Button>
          </Card>
          <PairPanel
            code={state.code}
            joinUrl={joinUrl}
            connected={state.connected}
            onStartHotseat={() => router.push("/play/local")}
          />
        </motion.div>
      </Shell>
    );
  }

  if (state.phase === "committing") {
    return (
      <Shell>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="p-7 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand" />
            <h2 className="mt-4 font-display text-xl font-bold">
              Setting up match…
            </h2>
            <p className="mt-2 text-sm text-muted">
              {state.stakeUsd > 0
                ? `$${state.stakeUsd} each · winner takes $${state.stakeUsd * 2}`
                : "Friendly game"}
              {state.withPowers && " · hidden powers active"}
            </p>
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted">
              <span className={cn(state.myCommitted && "text-good")}>
                You {state.myCommitted ? "ready" : "…"}
              </span>
              <span className={cn(state.oppCommitted && "text-good")}>
                Opponent {state.oppCommitted ? "ready" : "…"}
              </span>
            </div>
            <Button variant="ghost" className="mt-4" onClick={leave}>
              Cancel
            </Button>
          </Card>
        </motion.div>
      </Shell>
    );
  }

  /* ---------------- playing / ended ---------------- */

  const me = state.players.find((p) => p.seat === state.seat);
  const opp = state.players.find((p) => p.seat !== state.seat);
  const mySide = state.mySide;
  const oppSide = OTHER[mySide];

  const myCard = (
    <PlayerCard
      side={mySide}
      name={me?.name ?? "You"}
      subtitle={`You · ${mySide}`}
      active={toMove === mySide}
      captured={captured[mySide]}
    />
  );
  const oppCard = (
    <PlayerCard
      side={oppSide}
      name={opp?.name ?? "Opponent"}
      subtitle={oppSide}
      active={toMove === oppSide}
      captured={captured[oppSide]}
      align="right"
    />
  );

  return (
    <>
      <GameLayout
        title={`Room ${state.code}`}
        topPlayer={oppCard}
        bottomPlayer={myCard}
        board={<Board viewerSide={mySide} />}
        side={
          <>
            {state.stakeUsd > 0 && (
              <Card>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Coins className="h-4 w-4 text-gold" />
                  Winner takes all
                </div>
                <div className="mt-2 space-y-1 text-xs text-muted">
                  <div className="flex justify-between">
                    <span>Pot</span>
                    <span className="font-mono font-semibold text-gold">
                      ${state.stakeUsd * 2}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Each player</span>
                    <span className="font-mono">${state.stakeUsd}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bankroll</span>
                    <span className="font-mono">${useWagerStore.getState().bankroll}</span>
                  </div>
                </div>
              </Card>
            )}

            <Card>
              <div className="flex items-center justify-between">
                <Badge className="border-brand/40 bg-brand/10 text-brand">
                  <Lock className="h-3 w-3" />
                  Private Mode
                </Badge>
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  {state.connected ? (
                    <>
                      <Wifi className="h-3.5 w-3.5 text-good" /> Live
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3.5 w-3.5 text-warn" /> Reconnecting
                    </>
                  )}
                </span>
              </div>
              {state.withPowers && (
                <div className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
                  <p>
                    <Shield className="mr-1 inline h-3.5 w-3.5 text-brand-3" />
                    3 of your pieces carry hidden powers.
                  </p>
                  <p className="text-[10px] uppercase tracking-wider opacity-70">
                    {incoConfig.mode === "live"
                      ? "Live on Base Sepolia"
                      : "Demo mode"}
                  </p>
                </div>
              )}
            </Card>

            <Card>
              <h3 className="mb-3 font-display font-semibold">Controls</h3>
              <GameControls
                showUndo={false}
                showDraw={false}
                onResignSide={() => resign(mySide)}
              />
            </Card>
          </>
        }
      />

      {/* Power reveal toast */}
      <AnimatePresence>
        {state.toast && (
          <motion.div
            key={state.toast.id}
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
          >
            <div className="glass-strong flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-brand-3" />
              {state.toast.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <EndGameModal
        result={result}
        perspective={mySide}
        redName={mySide === "red" ? me?.name ?? "You" : opp?.name ?? "Opponent"}
        blackName={mySide === "black" ? me?.name ?? "You" : opp?.name ?? "Opponent"}
        onHome={() => {
          leave();
          router.push("/");
        }}
      >
        {state.stakeUsd > 0 && wagerOutcome && (
          <div
            className={cn(
              "rounded-xl border p-3 text-center text-sm font-semibold",
              wagerOutcome === "win"
                ? "border-gold/40 bg-gold/10 text-gold"
                : wagerOutcome === "draw"
                  ? "border-border bg-surface-2/50 text-muted"
                  : "border-bad/30 bg-bad/10 text-bad",
            )}
          >
            {wagerOutcome === "win"
              ? `You won $${state.stakeUsd * 2}!`
              : wagerOutcome === "draw"
                ? `Draw — $${state.stakeUsd} refunded`
                : `You lost $${state.stakeUsd}`}
          </div>
        )}
        <SettlePanel
          reveal={state.reveal}
          settleTx={state.settleTx}
          busy={state.busy}
          stakeUsd={state.stakeUsd}
          escrowLive={state.escrowLive}
        />
      </EndGameModal>
    </>
  );
}

function SettlePanel({
  reveal,
  settleTx,
  busy,
  stakeUsd,
  escrowLive,
}: {
  reveal: { mine?: number; theirs?: number } | null;
  settleTx: string | null;
  busy: boolean;
  stakeUsd: number;
  escrowLive: boolean;
}) {
  if (stakeUsd === 0 && !settleTx) return null;
  const explorer = escrowLive ? "https://basescan.org" : incoConfig.explorer;
  const txLabel = escrowLive ? "View on BaseScan" : "Attestation tx";
  return (
    <div className="rounded-xl border border-brand/30 bg-brand/5 p-4 text-left">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Coins className="h-4 w-4 text-gold" />
        {escrowLive ? "USDC escrow" : "Match stakes"}
      </div>
      {!settleTx ? (
        <div className="mt-2 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Your stake</span>
            <span className="font-mono">${reveal?.mine ?? stakeUsd} {escrowLive ? "USDC" : ""}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Opponent stake</span>
            <span className="font-mono">
              {reveal?.theirs != null ? `$${reveal.theirs}` : "sealed"}
            </span>
          </div>
          {busy && (
            <div className="flex items-center gap-1.5 pt-1 text-xs text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Settling on-chain…
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Your stake</span>
            <span className="font-mono">${reveal?.mine ?? stakeUsd} {escrowLive ? "USDC" : ""}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Opponent stake</span>
            <span className="font-mono">
              {reveal?.theirs != null ? `$${reveal.theirs}` : "…"}
            </span>
          </div>
          <a
            className="mt-1 flex items-center gap-1 text-xs text-brand hover:underline"
            href={`${explorer}/tx/${settleTx}`}
            target="_blank"
            rel="noreferrer"
          >
            {txLabel} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col">
      <AuroraBackground />
      <TopBar title="Online + Inco" />
      <div className="flex flex-1 items-center justify-center p-4">
        {children}
      </div>
    </main>
  );
}

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
import { useAccount } from "wagmi";
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
  const { state, create, join, commit, reportWinner, revealStakes, leave } =
    useOnlineGame();

  const result = useGameStore((s) => s.result);
  const toMove = useGameStore((s) => s.toMove);
  const captured = useGameStore((s) => s.captured);
  const resign = useGameStore((s) => s.resign);

  const [confidence, setConfidence] = React.useState(70);

  // When the game ends in online mode, report the winner once.
  const reported = React.useRef(false);
  React.useEffect(() => {
    if (state.phase !== "playing" || result.kind === "playing" || reported.current)
      return;
    reported.current = true;
    reportWinner(result.kind === "win" ? result.winner : "draw");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.kind, state.phase]);

  // Plain paired rooms (no Inco features) skip the commit ceremony.
  React.useEffect(() => {
    if (
      state.phase === "committing" &&
      !state.withPowers &&
      !state.wagerEnabled &&
      !state.myCommitted
    ) {
      commit(50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.withPowers, state.wagerEnabled, state.myCommitted]);

  const onLobby = (r: LobbyResult) => {
    if (r.action === "create") {
      create({
        name: r.name,
        withPowers: r.withPowers,
        wagerEnabled: r.wagerEnabled,
        buyInEth: r.buyInEth,
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
          <Card className="p-7">
            <Badge className="mb-4 border-brand/40 bg-brand/10 text-brand">
              <Lock className="h-3.5 w-3.5" />
              Private mode — powered by Inco Lightning
            </Badge>
            <h2 className="font-display text-2xl font-bold">
              Seal your secrets
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Before the first move, both players encrypt two values with{" "}
              <span className="text-text">Inco Lightning</span>:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li className="flex gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-3" />
                A <span className="text-text">power seed</span> that secretly
                grants 3 of your pieces hidden abilities — revealed only when
                captured.
              </li>
              <li className="flex gap-2">
                <Coins className="mt-0.5 h-4 w-4 shrink-0 text-gold" />A{" "}
                <span className="text-text">blind confidence bid</span> (0–100)
                — how sure you are you&apos;ll win. Both stay encrypted until
                the game ends.
              </li>
            </ul>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">Confidence</span>
                <span className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-brand">
                  {confidence}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={confidence}
                disabled={state.myCommitted}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                className="w-full accent-[rgb(124,92,246)]"
                aria-label="Confidence bid"
              />
            </div>

            <Button
              size="lg"
              className="mt-6 w-full"
              disabled={state.busy || state.myCommitted}
              onClick={() => commit(confidence)}
            >
              {state.busy ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Encrypting with Inco…
                </>
              ) : state.myCommitted ? (
                "Sealed ✓ waiting for opponent"
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  Encrypt & commit
                </>
              )}
            </Button>

            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted">
              <span className={cn(state.myCommitted && "text-good")}>
                You {state.myCommitted ? "✓" : "…"}
              </span>
              <span className={cn(state.oppCommitted && "text-good")}>
                Opponent {state.oppCommitted ? "✓" : "…"}
              </span>
            </div>
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
            <Card>
              <div className="flex items-center justify-between">
                <Badge className="border-brand/40 bg-brand/10 text-brand">
                  <Lock className="h-3 w-3" />
                  Inco Private Mode
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
              <div className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
                <p>
                  <Shield className="mr-1 inline h-3.5 w-3.5 text-brand-3" />
                  3 of your pieces carry hidden powers (only you can see them).
                </p>
                <p>
                  <Coins className="mr-1 inline h-3.5 w-3.5 text-gold" />
                  Blind bids stay encrypted until the end.
                </p>
                <p className="text-[10px] uppercase tracking-wider opacity-70">
                  {incoConfig.mode === "live"
                    ? "Live on Base Sepolia"
                    : "Demo: encryption simulated"}
                </p>
              </div>
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
        <SettlePanel
          reveal={state.reveal}
          settleTx={state.settleTx}
          busy={state.busy}
          onReveal={revealStakes}
        />
      </EndGameModal>
    </>
  );
}

function SettlePanel({
  reveal,
  settleTx,
  busy,
  onReveal,
}: {
  reveal: { mine?: number; theirs?: number } | null;
  settleTx: string | null;
  busy: boolean;
  onReveal: () => void;
}) {
  return (
    <div className="rounded-xl border border-brand/30 bg-brand/5 p-4 text-left">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Lock className="h-4 w-4 text-brand" />
        Inco settlement
      </div>
      {!settleTx ? (
        <>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Reveal the blind confidence bids and settle on-chain. Until now,
            neither side could see the other&apos;s bid.
          </p>
          <Button
            size="sm"
            className="mt-3 w-full"
            disabled={busy}
            onClick={onReveal}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Reveal & settle"
            )}
          </Button>
        </>
      ) : (
        <div className="mt-2 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Your bid</span>
            <span className="font-mono">{reveal?.mine ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Opponent bid</span>
            <span className="font-mono">{reveal?.theirs ?? "waiting…"}</span>
          </div>
          <a
            className="mt-1 flex items-center gap-1 text-xs text-brand hover:underline"
            href={`${incoConfig.explorer}/tx/${settleTx}`}
            target="_blank"
            rel="noreferrer"
          >
            Attestation tx <ExternalLink className="h-3 w-3" />
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

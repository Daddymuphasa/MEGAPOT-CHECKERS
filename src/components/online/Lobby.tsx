"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Plus, LogIn, Shield, Coins, Loader2, Copy, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConnectWallet } from "@/components/megapot/ConnectWallet";
import { useWagerStore } from "@/lib/megapot/wager-store";
import { cn } from "@/lib/utils";

export interface LobbyResult {
  action: "create" | "join";
  code?: string;
  name: string;
  withPowers: boolean;
  stakeUsd: number;
}

const STAKE_OPTIONS = [0, 1, 2, 5, 10] as const;

export function Lobby({
  onSubmit,
  busy,
  error,
  initialCode,
  pairMode,
}: {
  onSubmit: (r: LobbyResult) => void;
  busy: boolean;
  error?: string | null;
  initialCode?: string | null;
  pairMode?: boolean;
}) {
  const [tab, setTab] = React.useState<"create" | "join">(
    initialCode ? "join" : "create",
  );
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState(initialCode?.toUpperCase() ?? "");
  const [withPowers, setWithPowers] = React.useState(!pairMode);
  const [stakeUsd, setStakeUsd] = React.useState(pairMode ? 0 : 1);
  const bankroll = useWagerStore((s) => s.bankroll);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <div className="glass-hero relative overflow-hidden rounded-3xl p-7">
        {/* Shimmer */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div
            className="absolute inset-y-0 w-1/3 opacity-[0.06]"
            style={{
              background: "linear-gradient(90deg, transparent, white, transparent)",
              animation: "shimmer-sweep 4s ease-in-out infinite",
            }}
          />
        </div>
        <h1 className="relative mb-6 text-center font-display text-3xl font-black tracking-wide">
          <span className="text-chrome animate-neon-pulse">
            {tab === "create" ? "CREATE ARENA" : "JOIN THE FIGHT"}
          </span>
        </h1>

        {/* Display name */}
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
          Display name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Satoshi"
          maxLength={24}
          className="mb-5 w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm outline-none transition-colors placeholder:text-white/30 focus:border-brand/50 focus-visible:ring-focus"
        />

        {tab === "create" ? (
          <div className="mb-5 space-y-4">
            {/* Hidden powers toggle */}
            <label className="glass-pill flex items-center justify-between gap-3 rounded-full px-5 py-3">
              <span className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-brand-3" />
                Hidden powers
              </span>
              <Switch checked={withPowers} onChange={setWithPowers} />
            </label>

            {/* Stake picker */}
            <div className="glass-pill rounded-2xl p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <Coins className="h-4 w-4 text-gold" />
                  Entry ticket
                </span>
                <span className="text-xs text-muted">Bankroll ${bankroll}</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {STAKE_OPTIONS.map((w) => (
                  <button
                    key={w}
                    onClick={() => setStakeUsd(w)}
                    className={cn(
                      "rounded-full border py-2 text-sm font-semibold tabular-nums transition-all",
                      stakeUsd === w
                        ? "border-gold/60 bg-gold/10 text-gold"
                        : "border-white/10 bg-white/5 hover:border-white/20",
                    )}
                  >
                    {w === 0 ? "Free" : `$${w}`}
                  </button>
                ))}
              </div>
              {stakeUsd > 0 && (
                <p className="mt-2 text-xs text-muted">
                  Both stake ${stakeUsd} — winner takes ${stakeUsd * 2}.
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
              Room code
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="KX7-9QP"
              className="mb-5 w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 font-mono text-lg tracking-widest outline-none transition-colors placeholder:text-white/30 focus:border-brand/50"
            />
          </>
        )}

        {error && (
          <p className="mb-3 rounded-full bg-bad/10 px-4 py-2 text-center text-sm text-bad">
            {error}
          </p>
        )}

        {/* Main action buttons */}
        <div className="space-y-3">
          <Button
            size="lg"
            className={cn(
              "w-full",
              tab === "create" ? "" : "variant-secondary",
            )}
            disabled={busy || (tab === "join" && code.trim().length < 3)}
            onClick={() =>
              onSubmit({
                action: tab,
                code: code.trim(),
                name: name.trim() || (tab === "create" ? "Host" : "Guest"),
                withPowers,
                stakeUsd: tab === "create" ? stakeUsd : 0,
              })
            }
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : tab === "create" ? (
              <Plus className="h-5 w-5" />
            ) : (
              <LogIn className="h-5 w-5" />
            )}
            {tab === "create" ? "CREATE PRIVATE ROOM" : "JOIN ROOM"}
          </Button>

          <button
            onClick={() => setTab(tab === "create" ? "join" : "create")}
            className="glass-pill mx-auto flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            {tab === "create" ? (
              <>
                <LogIn className="h-4 w-4" />
                JOIN WITH CODE
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                CREATE ROOM INSTEAD
              </>
            )}
          </button>
        </div>

        {/* Wallet connect at bottom */}
        <div className="mt-5 flex items-center justify-center gap-3">
          <Lock className="h-4 w-4 text-muted" />
          <ConnectWallet />
        </div>
      </div>
    </motion.div>
  );
}

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="glass-pill inline-flex items-center gap-2 rounded-full px-5 py-2 font-mono text-lg tracking-widest transition-colors hover:border-white/20"
    >
      {code}
      {copied ? (
        <Check className="h-4 w-4 text-good" />
      ) : (
        <Copy className="h-4 w-4 text-muted" />
      )}
    </button>
  );
}

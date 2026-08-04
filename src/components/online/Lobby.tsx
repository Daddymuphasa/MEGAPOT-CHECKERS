"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Plus, LogIn, Shield, Coins, Loader2, Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { WalletButton } from "./WalletButton";
import { incoConfig } from "@/lib/inco/config";
import { cn } from "@/lib/utils";

export interface LobbyResult {
  action: "create" | "join";
  code?: string;
  name: string;
  withPowers: boolean;
  wagerEnabled: boolean;
  buyInEth: string;
}

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
  /** Deep-linked room code (QR scan) — preselects the Join tab. */
  initialCode?: string | null;
  /** Device pairing mode — preselects Create with Inco features off. */
  pairMode?: boolean;
}) {
  const [tab, setTab] = React.useState<"create" | "join">(
    initialCode ? "join" : "create",
  );
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState(initialCode?.toUpperCase() ?? "");
  const [withPowers, setWithPowers] = React.useState(!pairMode);
  const [wagerEnabled, setWagerEnabled] = React.useState(!pairMode);
  const [buyIn, setBuyIn] = React.useState("0.001");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <Card className="p-7">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Play Online</h1>
            <p className="text-sm text-muted">Private matches on Base</p>
          </div>
          <WalletButton />
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-full border border-border bg-surface-2/50 p-1">
          {(["create", "join"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "relative h-9 rounded-full text-sm font-medium capitalize transition-colors",
                tab === t ? "text-white" : "text-muted",
              )}
            >
              {tab === t && (
                <motion.span
                  layoutId="lobby-tab"
                  className="absolute inset-0 -z-10 rounded-full brand-gradient"
                />
              )}
              {t === "create" ? "Create room" : "Join room"}
            </button>
          ))}
        </div>

        <label className="mb-1.5 block text-sm font-medium text-muted">
          Display name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Satoshi"
          maxLength={24}
          className="mb-4 w-full rounded-xl border border-border bg-surface-2/50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand/60 focus-visible:ring-focus"
        />

        {tab === "join" ? (
          <>
            <label className="mb-1.5 block text-sm font-medium text-muted">
              Room code
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="KX7-9QP"
              className="mb-4 w-full rounded-xl border border-border bg-surface-2/50 px-4 py-2.5 font-mono text-lg tracking-widest outline-none transition-colors focus:border-brand/60"
            />
          </>
        ) : (
          <div className="mb-4 space-y-3 rounded-xl border border-border bg-surface-2/30 p-4">
            <label className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-brand-3" />
                Hidden power-ups
                <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand">
                  INCO
                </span>
              </span>
              <Switch checked={withPowers} onChange={setWithPowers} />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm">
                <Coins className="h-4 w-4 text-gold" />
                Confidential wager
              </span>
              <Switch checked={wagerEnabled} onChange={setWagerEnabled} />
            </label>
            {wagerEnabled && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  value={buyIn}
                  onChange={(e) => setBuyIn(e.target.value)}
                  inputMode="decimal"
                  className="w-24 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-brand/60"
                />
                <span className="text-sm text-muted">ETH buy-in each</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mb-3 rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">
            {error}
          </p>
        )}

        <Button
          size="lg"
          className="w-full"
          disabled={busy || (tab === "join" && code.trim().length < 3)}
          onClick={() =>
            onSubmit({
              action: tab,
              code: code.trim(),
              name: name.trim() || (tab === "create" ? "Host" : "Guest"),
              withPowers,
              wagerEnabled,
              buyInEth: buyIn,
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
          {tab === "create" ? "Create private room" : "Join room"}
        </Button>

        <p className="mt-4 text-center text-xs text-muted">
          {incoConfig.mode === "live" ? (
            <>Live · Inco Lightning on Base Sepolia</>
          ) : (
            <>Demo mode · Inco encryption simulated locally (no wallet needed)</>
          )}
        </p>
      </Card>
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
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-2/60 px-3 py-1.5 font-mono text-lg tracking-widest transition-colors hover:border-brand/50"
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

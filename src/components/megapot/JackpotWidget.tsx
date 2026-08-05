"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Ticket as TicketIcon, Timer, Coins } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useJackpot } from "@/lib/megapot/useJackpot";
import { formatUsd } from "@/lib/megapot/client";
import { useWagerStore } from "@/lib/megapot/wager-store";
import { BuyTicketsModal } from "./BuyTicketsModal";

/** Eases a displayed dollar amount toward the live pot value. */
function useCountUp(target: number) {
  const [value, setValue] = React.useState(target);
  React.useEffect(() => {
    let raf = 0;
    const tick = () => {
      setValue((v) => {
        const diff = target - v;
        if (Math.abs(diff) < 1) return target;
        return v + diff * 0.08;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return Math.round(value);
}

function Countdown({ to }: { to: number }) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const secs = Math.max(0, to - Math.floor(now / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="tabular-nums">{`${pad(h)}:${pad(m)}:${pad(s)}`}</span>
  );
}

export function JackpotWidget({ className }: { className?: string }) {
  const { jackpot } = useJackpot();
  const [buying, setBuying] = React.useState(false);
  const ticketsBought = useWagerStore((s) => s.ticketsBought);
  const dollars = useCountUp(
    jackpot ? Number(jackpot.prizePool / 1_000_000n) : 0,
  );

  if (!jackpot) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 110 }}
      className={className}
    >
      <Card className="relative w-full overflow-hidden border border-gold/25 text-left animate-gold-pulse">
        {/* Animated gold glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-gold/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 -bottom-16 h-40 w-40 rounded-full bg-gold/10 blur-3xl"
        />
        {/* Shimmer sweep */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div
            className="absolute inset-y-0 w-1/3 opacity-[0.06]"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(245,194,66,.8), transparent)",
              animation: "shimmer-sweep 5s ease-in-out infinite",
            }}
          />
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="border-gold/40 bg-gold/10 text-gold">
                <Coins className="h-3.5 w-3.5" />
                Megapot daily jackpot
              </Badge>
              {jackpot.mode === "mock" && (
                <Badge className="border-brand/30 bg-brand/10 text-brand">
                  demo
                </Badge>
              )}
            </div>
            <div className="mt-2 font-display text-4xl font-extrabold tracking-tight tabular-nums text-gold sm:text-5xl drop-shadow-[0_0_20px_rgba(245,194,66,.3)]">
              ${dollars.toLocaleString("en-US")}
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <Timer className="h-3.5 w-3.5 text-gold/60" />
                Draws in <Countdown to={jackpot.drawingTime} />
              </span>
              <span>·</span>
              <span>{formatUsd(jackpot.ticketPrice)} a ticket</span>
              {ticketsBought > 0 && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-gold">
                    <TicketIcon className="h-3.5 w-3.5" />
                    {ticketsBought} ticket{ticketsBought !== 1 ? "s" : ""}
                  </span>
                </>
              )}
            </div>
          </div>
          <Button variant="gold" size="lg" onClick={() => setBuying(true)}>
            <TicketIcon className="h-5 w-5" />
            Grab a ticket
          </Button>
        </div>
      </Card>

      <BuyTicketsModal
        open={buying}
        onClose={() => setBuying(false)}
        jackpot={jackpot}
      />
    </motion.div>
  );
}

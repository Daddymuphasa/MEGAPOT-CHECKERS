"use client";

import * as React from "react";
import { Sparkles, Ticket as TicketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useJackpot } from "@/lib/megapot/useJackpot";
import { formatUsd } from "@/lib/megapot/client";
import { BuyTicketsModal } from "./BuyTicketsModal";

/** Post-win nudge: winner's luck is hot, the Megapot is one tap away. */
export function WinnersLuck() {
  const { jackpot } = useJackpot();
  const [buying, setBuying] = React.useState(false);

  if (!jackpot) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gold/30 bg-gold/10 p-3 text-left">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-gold">
          <Sparkles className="h-4 w-4 shrink-0" />
          Winner&apos;s luck is hot
        </p>
        <p className="truncate text-xs text-muted">
          Today&apos;s Megapot: {formatUsd(jackpot.prizePool)}
        </p>
      </div>
      <Button variant="gold" size="sm" onClick={() => setBuying(true)}>
        <TicketIcon className="h-4 w-4" />
        Ride it
      </Button>

      <BuyTicketsModal
        open={buying}
        onClose={() => setBuying(false)}
        jackpot={jackpot}
      />
    </div>
  );
}

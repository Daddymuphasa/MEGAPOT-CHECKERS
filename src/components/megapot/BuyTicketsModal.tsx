"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Dices, Minus, Plus, Ticket as TicketIcon, Wallet, Check } from "lucide-react";
import { useAccount, useConnect, useWalletClient } from "wagmi";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { Web3Provider } from "@/components/online/Web3Provider";
import { celebrate } from "@/components/game/confetti";
import { sound } from "@/lib/sound";
import {
  megapot,
  formatUsd,
  type JackpotState,
  type Ticket,
} from "@/lib/megapot/client";
import { megapotConfig } from "@/lib/megapot/config";
import { useWagerStore } from "@/lib/megapot/wager-store";

interface BuyTicketsModalProps {
  open: boolean;
  onClose: () => void;
  jackpot: JackpotState;
}

function TicketRow({ ticket, index }: { ticket: Ticket; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-1.5"
    >
      {ticket.normals.map((n) => (
        <span
          key={n}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-2 text-xs font-bold tabular-nums"
        >
          {n}
        </span>
      ))}
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gold to-amber-400 text-xs font-bold text-black tabular-nums">
        {ticket.bonusball}
      </span>
    </motion.div>
  );
}

/** Mounted fresh each time the modal opens, so picks/phase reset naturally. */
function TicketPicker({
  jackpot,
  onClose,
}: {
  jackpot: JackpotState;
  onClose: () => void;
}) {
  const isMock = jackpot.mode === "mock";
  const [tickets, setTickets] = React.useState<Ticket[]>(() => [
    megapot().quickPick(jackpot),
  ]);
  const [phase, setPhase] = React.useState<"pick" | "buying" | "done">("pick");
  const [hash, setHash] = React.useState<`0x${string}` | null>(null);
  const [buyError, setBuyError] = React.useState<string | null>(null);

  const { isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { data: walletClient } = useWalletClient();

  const total = jackpot.ticketPrice * BigInt(tickets.length || 0);

  const addTicket = () =>
    setTickets((t) =>
      t.length >= 10 ? t : [...t, megapot().quickPick(jackpot)],
    );
  const removeTicket = () => setTickets((t) => t.slice(0, -1));
  const reroll = () =>
    setTickets((t) => t.map(() => megapot().quickPick(jackpot)));

  const buy = async () => {
    setPhase("buying");
    setBuyError(null);
    try {
      const res = await megapot().buyTickets(tickets, jackpot, walletClient);
      setHash(res.hash);
      useWagerStore.getState().addTickets(tickets.length);
      setPhase("done");
      celebrate();
      sound.play("win");
    } catch (e) {
      setPhase("pick");
      setBuyError(e instanceof Error ? e.message : "Purchase failed");
    }
  };

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-amber-400 shadow-[0_16px_40px_-14px_rgb(245_194_66/.8)]">
        <TicketIcon className="h-7 w-7 text-black" />
      </div>
      <h2 id="megapot-buy-title" className="font-display text-2xl font-bold">
        {phase === "done" ? "You're in the draw!" : "Megapot tickets"}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {phase === "done"
          ? `${tickets.length} ticket${tickets.length > 1 ? "s" : ""} for the ${formatUsd(jackpot.prizePool)} pot — good luck!`
          : `Today's pot: ${formatUsd(jackpot.prizePool)} · ${formatUsd(jackpot.ticketPrice)} a ticket`}
      </p>
      {isMock && (
        <Badge className="mt-2 border-brand/30 bg-brand/10 text-brand">
          Demo mode — no real money
        </Badge>
      )}

      <div className="mt-5 flex max-h-52 w-full flex-col items-center gap-2 overflow-y-auto">
        {tickets.map((t, i) => (
          <TicketRow
            key={`${i}-${t.normals.join("-")}-${t.bonusball}`}
            ticket={t}
            index={i}
          />
        ))}
      </div>

      {phase === "pick" && (
        <>
          <div className="mt-4 flex items-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              aria-label="Remove a ticket"
              disabled={tickets.length <= 1}
              onClick={removeTicket}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-10 text-center font-display text-lg font-bold tabular-nums">
              {tickets.length}
            </span>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Add a ticket"
              disabled={tickets.length >= 10}
              onClick={addTicket}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={reroll}>
              <Dices className="h-4 w-4" />
              Re-roll
            </Button>
          </div>

          {buyError && (
            <p className="mt-3 w-full truncate text-xs text-bad">{buyError}</p>
          )}

          {!isMock && !isConnected ? (
            <Button
              variant="gold"
              className="mt-5 w-full"
              disabled={isPending || !connectors[0]}
              onClick={() =>
                connectors[0] && connect({ connector: connectors[0] })
              }
            >
              <Wallet className="h-4 w-4" />
              {isPending ? "Connecting…" : "Connect wallet to buy"}
            </Button>
          ) : (
            <Button variant="gold" className="mt-5 w-full" onClick={buy}>
              <TicketIcon className="h-4 w-4" />
              Buy {tickets.length} ticket{tickets.length > 1 ? "s" : ""} ·{" "}
              {formatUsd(total)}
            </Button>
          )}
        </>
      )}

      {phase === "buying" && (
        <Button variant="gold" className="mt-5 w-full" disabled>
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
          >
            <Dices className="h-4 w-4" />
          </motion.span>
          {isMock ? "Buying…" : "Confirm in wallet…"}
        </Button>
      )}

      {phase === "done" && (
        <div className="mt-5 flex w-full flex-col gap-2">
          {!isMock && hash && (
            <a
              href={`${megapotConfig.explorer}/tx/${hash}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brand underline-offset-2 hover:underline"
            >
              View transaction on BaseScan
            </a>
          )}
          <Button variant="secondary" className="w-full" onClick={onClose}>
            <Check className="h-4 w-4" />
            Done
          </Button>
        </div>
      )}
    </div>
  );
}

/** Wrapped in Web3Provider so it works on any page; the shared wagmi config
 *  means wallet state is one and the same everywhere. */
export function BuyTicketsModal({ open, onClose, jackpot }: BuyTicketsModalProps) {
  return (
    <Web3Provider>
      <Modal open={open} onClose={onClose} labelledBy="megapot-buy-title">
        <TicketPicker jackpot={jackpot} onClose={onClose} />
      </Modal>
    </Web3Provider>
  );
}

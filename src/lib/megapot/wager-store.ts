"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WagerOutcome = "win" | "lose" | "draw";

/**
 * Winner-takes-all match wagers, paid with demo credits (mock USDC dollars).
 * Each player buys a $1+ entry ticket; the pot is 2× the stake and the winner
 * takes it all (a draw refunds both entries). Vs AI this is only offered on
 * Hard — the AI matches your ticket. Real-money escrow would settle through
 * the ConfidentialCheckers contract; demo credits keep it playable anywhere.
 */
interface WagerState {
  /** Demo bankroll in whole dollars. Persisted. */
  bankroll: number;
  /** Total Megapot lottery tickets purchased this session. Persisted. */
  ticketsBought: number;
  /** Your current entry ticket for the active match. */
  stake: number;
  /** Total prize (2× stake — opponent matched your ticket). */
  pot: number;
  settled: boolean;
  outcome: WagerOutcome | null;
  /** Buy a $1+ entry ticket. Returns false if the bankroll can't cover it. */
  buyEntry: (amount: number) => boolean;
  /** Settle the match once; returns what was added back to the bankroll. */
  settle: (outcome: WagerOutcome) => number;
  /** Reset the match wager (new game / leaving the table). */
  clear: () => void;
  /** Demo-only faucet. */
  topUp: () => void;
  /** Track Megapot lottery ticket purchases. */
  addTickets: (count: number) => void;
}

export const useWagerStore = create<WagerState>()(
  persist(
    (set, get) => ({
      bankroll: 25,
      ticketsBought: 0,
      stake: 0,
      pot: 0,
      settled: false,
      outcome: null,

      buyEntry: (amount) => {
        const { bankroll } = get();
        if (amount < 1 || amount > bankroll) return false;
        set({
          bankroll: bankroll - amount,
          stake: amount,
          pot: amount * 2,
          settled: false,
          outcome: null,
        });
        return true;
      },

      settle: (outcome) => {
        const { stake, pot, settled } = get();
        if (settled || stake === 0) return 0;
        const back = outcome === "win" ? pot : outcome === "draw" ? stake : 0;
        set((s) => ({ bankroll: s.bankroll + back, settled: true, outcome }));
        return back;
      },

      clear: () => set({ stake: 0, pot: 0, settled: false, outcome: null }),

      topUp: () => set((s) => ({ bankroll: s.bankroll + 10 })),

      addTickets: (count) => set((s) => ({ ticketsBought: s.ticketsBought + count })),
    }),
    {
      name: "megapot.wager",
      partialize: (s) => ({ bankroll: s.bankroll, ticketsBought: s.ticketsBought }),
    },
  ),
);

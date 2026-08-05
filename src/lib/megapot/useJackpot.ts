"use client";

import * as React from "react";
import { megapot, type JackpotState } from "./client";

/** Polls the Megapot jackpot (5s in mock so the pot visibly climbs, 30s live). */
export function useJackpot() {
  const [jackpot, setJackpot] = React.useState<JackpotState | null>(null);
  const [error, setError] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      setJackpot(await megapot().getJackpot());
      setError(false);
    } catch (e) {
      console.warn("[megapot] jackpot fetch failed", e);
      setError(true);
    }
  }, []);

  React.useEffect(() => {
    const ms = megapot().mode === "mock" ? 5_000 : 30_000;
    const first = setTimeout(refresh, 0);
    const id = setInterval(refresh, ms);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [refresh]);

  return { jackpot, error, refresh };
}

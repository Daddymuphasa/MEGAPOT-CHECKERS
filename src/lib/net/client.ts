"use client";

import type { RoomEvent, RoomPlayer, RoomSnapshot, Seat } from "./protocol";

export interface CreateOpts {
  name: string;
  address?: string;
  withPowers: boolean;
  wagerEnabled: boolean;
  /** Winner-takes-all stake in whole dollars (0 = friendly game). */
  stakeUsd: number;
  /** On-chain escrow game ID, so the guest can join the same game. */
  escrowGameId?: string;
}

/** Poll cadence: snappy during play, backing off while nothing is happening. */
const FAST_MS = 600;
const IDLE_MS = 1500;
const IDLE_AFTER = 15; // consecutive empty polls before backing off

interface PollResponse {
  cursor: number;
  events: RoomEvent[];
  players: RoomPlayer[];
  presence: Record<Seat, boolean>;
}

/**
 * Room transport. Polls the server for events rather than holding an SSE
 * stream — Vercel's function duration cap would sever a long-lived connection
 * mid-game. The public surface is unchanged for callers.
 */
export class RoomConnection {
  code = "";
  seat: Seat = "host";
  clientId = "";
  private handlers = new Set<(ev: RoomEvent) => void>();
  private statusHandlers = new Set<(open: boolean) => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private abort: AbortController | null = null;
  private stopped = false;
  private cursor: number | null = null;
  private emptyPolls = 0;
  private peerWasPresent = false;

  static async create(
    opts: CreateOpts,
  ): Promise<{ code: string; snapshot: RoomSnapshot; durable: boolean }> {
    const res = await fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    if (!res.ok) throw new Error("Failed to create room");
    return res.json();
  }

  static async join(
    code: string,
    opts: { name: string; address?: string },
  ): Promise<{ seat: Seat; snapshot: RoomSnapshot }> {
    const res = await fetch(`/api/room/${code}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || "Failed to join room");
    }
    return res.json();
  }

  connect(code: string, seat: Seat) {
    this.code = code.toUpperCase();
    this.seat = seat;
    this.clientId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    this.stopped = false;
    this.cursor = null;
    this.emptyPolls = 0;
    this.peerWasPresent = false;
    void this.poll();
  }

  private schedule(ms: number) {
    if (this.stopped) return;
    this.timer = setTimeout(() => void this.poll(), ms);
  }

  private async poll() {
    if (this.stopped) return;
    this.abort = new AbortController();
    try {
      const since = this.cursor === null ? "" : `&since=${this.cursor}`;
      const res = await fetch(
        `/api/room/${this.code}/events?clientId=${this.clientId}&seat=${this.seat}${since}`,
        { signal: this.abort.signal, cache: "no-store" },
      );
      if (!res.ok) {
        // 404 means the room expired or was never durable — surface as offline.
        this.setStatus(false);
        this.schedule(IDLE_MS);
        return;
      }
      const data = (await res.json()) as PollResponse;
      this.setStatus(true);
      this.cursor = data.cursor;

      for (const ev of data.events) this.handlers.forEach((h) => h(ev));
      this.detectPeerLeft(data.presence);

      if (data.events.length > 0) {
        this.emptyPolls = 0;
      } else {
        this.emptyPolls++;
      }
      this.schedule(this.emptyPolls >= IDLE_AFTER ? IDLE_MS : FAST_MS);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      this.setStatus(false);
      this.schedule(IDLE_MS);
    }
  }

  /**
   * Presence is derived from self-expiring server keys, so a closed tab shows
   * up as a true→false flip. Synthesised here to keep the event contract that
   * the game hook already understands.
   */
  private detectPeerLeft(presence: Record<Seat, boolean>) {
    const peerSeat: Seat = this.seat === "host" ? "guest" : "host";
    const present = Boolean(presence?.[peerSeat]);
    if (this.peerWasPresent && !present) {
      const ev: RoomEvent = { type: "peer-left", seat: peerSeat };
      this.handlers.forEach((h) => h(ev));
    }
    this.peerWasPresent = present;
  }

  private setStatus(open: boolean) {
    this.statusHandlers.forEach((h) => h(open));
  }

  onEvent(fn: (ev: RoomEvent) => void) {
    this.handlers.add(fn);
    return () => this.handlers.delete(fn);
  }

  onStatus(fn: (open: boolean) => void) {
    this.statusHandlers.add(fn);
    return () => this.statusHandlers.delete(fn);
  }

  async emit(event: RoomEvent) {
    await fetch(`/api/room/${this.code}/emit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: this.clientId, event }),
    }).catch(() => {});
    // Don't wait out the backoff after acting — the peer's reply matters now.
    this.emptyPolls = 0;
  }

  close() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.abort?.abort();
    this.abort = null;
    this.handlers.clear();
    this.statusHandlers.clear();
  }
}

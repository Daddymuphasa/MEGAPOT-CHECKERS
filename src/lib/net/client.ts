"use client";

import type { RoomEvent, RoomSnapshot, Seat } from "./protocol";

export interface CreateOpts {
  name: string;
  address?: string;
  withPowers: boolean;
  wagerEnabled: boolean;
}

export class RoomConnection {
  code = "";
  seat: Seat = "host";
  clientId = "";
  private es: EventSource | null = null;
  private handlers = new Set<(ev: RoomEvent) => void>();
  private statusHandlers = new Set<(open: boolean) => void>();

  static async create(opts: CreateOpts): Promise<{ code: string; snapshot: RoomSnapshot }> {
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
    const url = `/api/room/${this.code}/events?clientId=${this.clientId}&seat=${seat}`;
    const es = new EventSource(url);
    this.es = es;
    es.onopen = () => this.statusHandlers.forEach((h) => h(true));
    es.onerror = () => this.statusHandlers.forEach((h) => h(false));
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as RoomEvent;
        this.handlers.forEach((h) => h(ev));
      } catch {
        /* ignore heartbeats / malformed */
      }
    };
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
  }

  close() {
    this.es?.close();
    this.es = null;
    this.handlers.clear();
    this.statusHandlers.clear();
  }
}

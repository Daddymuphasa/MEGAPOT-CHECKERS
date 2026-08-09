import "server-only";
import { kv, isKvConfigured } from "./kv";

/**
 * The tiny key/value surface room-store needs. Two implementations:
 *   - Redis (Upstash REST) — shared across serverless invocations. Required
 *     in production; without it every lambda gets its own empty state.
 *   - Memory — a per-process map, so `next dev` works with zero setup.
 */
export interface Backend {
  readonly durable: boolean;
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttl: number): Promise<void>;
  setIfAbsent(key: string, value: unknown, ttl: number): Promise<boolean>;
  push(key: string, value: unknown, ttl: number): Promise<void>;
  range<T>(key: string, start: number, stop: number): Promise<T[]>;
  touch(key: string, ttl: number): Promise<void>;
  exists(keys: string[]): Promise<boolean[]>;
  mget<T>(keys: string[]): Promise<(T | null)[]>;
}

const kvBackend: Backend = { durable: true, ...kv };

// ---- In-process fallback (dev only) ----------------------------------------

interface Entry {
  value: unknown;
  list?: unknown[];
  expiresAt: number;
}

const g = globalThis as unknown as { __megapotKv?: Map<string, Entry> };
g.__megapotKv ??= new Map<string, Entry>();
const mem = g.__megapotKv;

function live(key: string): Entry | undefined {
  const e = mem.get(key);
  if (!e) return undefined;
  if (e.expiresAt < Date.now()) {
    mem.delete(key);
    return undefined;
  }
  return e;
}

const memoryBackend: Backend = {
  durable: false,
  async get<T>(key: string) {
    return (live(key)?.value as T) ?? null;
  },
  async set(key, value, ttl) {
    mem.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
  },
  async setIfAbsent(key, value, ttl) {
    if (live(key)) return false;
    mem.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
    return true;
  },
  async push(key, value, ttl) {
    const e = live(key);
    const list = e?.list ?? [];
    list.push(value);
    mem.set(key, { value: null, list, expiresAt: Date.now() + ttl * 1000 });
  },
  async range<T>(key: string, start: number, stop: number) {
    const list = (live(key)?.list ?? []) as T[];
    return stop === -1 ? list.slice(start) : list.slice(start, stop + 1);
  },
  async touch(key, ttl) {
    mem.set(key, { value: Date.now(), expiresAt: Date.now() + ttl * 1000 });
  },
  async exists(keys) {
    return keys.map((k) => Boolean(live(k)));
  },
  async mget<T>(keys: string[]) {
    return keys.map((k) => (live(k)?.value as T) ?? null);
  },
};

export const backend: Backend = isKvConfigured() ? kvBackend : memoryBackend;
export const isDurable = backend.durable;

import "server-only";

/**
 * Minimal Upstash Redis REST client (no dependency — plain fetch).
 *
 * Credentials come from either naming scheme, so the Vercel Marketplace
 * "Upstash for Redis" integration works with no extra config:
 *   - KV_REST_API_URL / KV_REST_API_TOKEN            (Vercel integration)
 *   - UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN  (Upstash direct)
 *
 * When neither is set, `isKvConfigured()` is false and room-store falls back
 * to a per-process in-memory map — fine for `next dev`, useless on serverless.
 */

const URL_ =
  process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "";
const TOKEN =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

export function isKvConfigured() {
  return Boolean(URL_ && TOKEN);
}

type Cmd = (string | number)[];

async function send<T>(body: unknown, path = ""): Promise<T> {
  const res = await fetch(`${URL_}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`KV ${res.status}: ${await res.text().catch(() => "")}`);
  }
  return res.json() as Promise<T>;
}

/** Run one Redis command. */
async function cmd<T>(...args: Cmd): Promise<T> {
  const { result } = await send<{ result: T }>(args);
  return result;
}

/** Run several commands in one round-trip. */
async function pipeline<T extends unknown[]>(...cmds: Cmd[]): Promise<T> {
  if (cmds.length === 0) return [] as unknown as T;
  const out = await send<{ result: unknown }[]>(cmds, "/pipeline");
  return out.map((r) => r.result) as T;
}

export const kv = {
  isConfigured: isKvConfigured,

  async get<T>(key: string): Promise<T | null> {
    const raw = await cmd<string | null>("GET", key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await cmd("SET", key, JSON.stringify(value), "EX", ttlSeconds);
  },

  /** SET ... NX — returns true only if the key did not already exist. */
  async setIfAbsent(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<boolean> {
    const r = await cmd<string | null>(
      "SET",
      key,
      JSON.stringify(value),
      "EX",
      ttlSeconds,
      "NX",
    );
    return r === "OK";
  },

  /** Append to a list and refresh its TTL in a single round-trip. */
  async push(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await pipeline(
      ["RPUSH", key, JSON.stringify(value)],
      ["EXPIRE", key, ttlSeconds],
    );
  },

  /** Inclusive range; `stop = -1` means "to the end". */
  async range<T>(key: string, start: number, stop: number): Promise<T[]> {
    const raw = await cmd<string[] | null>("LRANGE", key, start, stop);
    if (!raw) return [];
    return raw.flatMap((s) => {
      try {
        return [JSON.parse(s) as T];
      } catch {
        return [];
      }
    });
  },

  /** Mark a client as alive; the key self-expires so absence == gone. */
  async touch(key: string, ttlSeconds: number): Promise<void> {
    await cmd("SET", key, Date.now(), "EX", ttlSeconds);
  },

  async exists(keys: string[]): Promise<boolean[]> {
    if (keys.length === 0) return [];
    const out = await pipeline<number[]>(...keys.map((k) => ["EXISTS", k]));
    return out.map((n) => n === 1);
  },

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];
    const out = await pipeline<(string | null)[]>(
      ...keys.map((k) => ["GET", k]),
    );
    return out.map((raw) => {
      if (raw == null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    });
  },
};

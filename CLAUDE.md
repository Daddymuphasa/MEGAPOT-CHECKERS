# Megapot Checkers — agent notes

- Rules engine: src/lib/game/engine.ts (pure, tested via `npx tsx src/lib/game/engine.test.ts`)
- AI: src/lib/ai (runs in a Web Worker; keep imports relative inside lib/ai + lib/game)
- Game state: src/store/game-store.ts (Zustand). Online sync: src/lib/net/*
- Online PvP: rooms live in Redis (src/lib/net/kv.ts), NOT process memory —
  serverless spreads requests across instances. Falls back to an in-process
  map when KV_REST_API_* is unset (dev only). Transport is cursor polling,
  not SSE (Vercel kills long-lived connections). Test with the dev server up:
  `npx tsx src/lib/net/client.test.ts`
- Inco: src/lib/inco (mock by default; live mode gated by NEXT_PUBLIC_INCO_MODE + contract addr)
- Megapot: src/lib/megapot (mock by default; live = real Jackpot on Base mainnet, gated by NEXT_PUBLIC_MEGAPOT_MODE). UI in src/components/megapot
- Contract: contracts/ConfidentialCheckers.sol (@inco/lightning Lib.sol API)
- Check with: npx tsc --noEmit && npx eslint src && npm run build

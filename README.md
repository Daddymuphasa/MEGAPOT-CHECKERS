<div align="center">

# ♟️ Megapot Checkers

### Checkers, reimagined — buttery-smooth, monster-bite fun, and the first checkers with **confidential wagers** powered by **[Inco Lightning](https://docs.inco.org)** on Base.

*Every capture is a CHOMP. Every stake is a secret.*

</div>

---

## ✨ What is this?

A production-quality Checkers (English draughts) web app with three game modes and a privacy twist that is only possible with confidential compute:

| Mode | What you get |
| --- | --- |
| 🎮 **Local & paired devices** | Pass-and-play on one device, or pair a second phone/laptop via **QR code** with real-time sync (Web Bluetooth availability is detected; since browser BT is central-only, pairing rides a QR + realtime channel — the honest web-platform answer) |
| 🤖 **Player vs AI** | Minimax + alpha-beta engine in a **Web Worker** — Easy (depth 3 + noise + deliberate blunders) and Hard (depth 7, time-budgeted, mobility + king-safety evaluation) |
| 🌐 **Online + Inco** | Room-code matchmaking, real-time play, and **two confidential mechanics** built on Inco Lightning (below) |

Plus: mandatory captures, multi-jumps, optional flying kings, undo (local), resign/draw, monster-bite capture animations with crunchy procedural sound, king-crowning sparkles, blinking "alive" pieces, dark/light themes, three board skins, full keyboard navigation and ARIA labels.

## 🔒 How the Inco integration works

Two mechanics that are **impossible (or require trust) on a transparent chain**:

1. **Blind confidence bids** — before move one, each player commits an encrypted 0–100 bid of how confident they are. On a public chain your opponent would read your bid from calldata and gain psychological edge / bet-sizing info. With Inco it stays an `euint256` until the game ends, then is revealed via **attested decryption** — provably fixed up-front, verifiably revealed after.
2. **Hidden power-up pieces** — each player commits an encrypted `powerSeed`. The seed deterministically marks 3 of their pieces with secret abilities (🛡 shield, ⚡ double, 💀 saboteur). Your opponent cannot see *or grind* the layout (the seed is ciphertext on-chain), yet you cannot change it after commit. Powers are revealed only when a piece is captured — with a reveal toast.

```
┌────────────┐   room events (SSE)   ┌────────────┐
│  Player A  │◄─────────────────────►│  Player B  │
│  (browser) │                       │  (browser) │
└─────┬──────┘                       └──────┬─────┘
      │  @inco/js encrypt()                 │  @inco/js encrypt()
      │  (stake, powerSeed → ciphertext)    │
      ▼                                     ▼
┌─────────────────────────────────────────────────┐
│      ConfidentialCheckers.sol (Base Sepolia)    │
│                                                 │
│  openGame(encStake, encSeed)  + ETH buy-in      │
│  joinGame(id, encStake, encSeed) + buy-in       │
│      euint256 stakes/seeds via e.newEuint256    │
│  reportResult(id, winner)   ← 2-of-2 agreement  │
│  claim(id)                  ← winner takes pot  │
│  revealStakes(id)           ← e.reveal(...)     │
└───────────────────────┬─────────────────────────┘
                        │ attestedReveal(handles)
                        ▼
             ┌─────────────────────┐
             │  Inco covalidators  │  → plaintext + signatures
             └─────────────────────┘
```

**Settlement flow:** both clients report the winner (2-of-2 oracle) → contract settles → winner `claim()`s the pot trustlessly → either player calls `revealStakes()`, which marks the encrypted stakes publicly decryptable → anyone fetches the attested plaintext with `@inco/js attestedReveal()` and can verify the covalidator signatures.

### Demo mode vs live mode

The app ships **runnable with zero setup**: `NEXT_PUBLIC_INCO_MODE=mock` (default) simulates the encryption locally with the same commit→play→reveal choreography, so judges can play the whole flow without a wallet. Flip to `live` + deploy the contract for real Base Sepolia settlement — the client code paths are identical (`src/lib/inco/client.ts` lazy-loads `@inco/js` and calls `Lightning.baseSepoliaTestnet()`, `encrypt()`, `attestedReveal()`).

## 🚀 Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

That's it — all three modes work immediately (online mode uses an in-process room relay; open two browser windows to play yourself).

### Tests

```bash
npx tsx src/lib/game/engine.test.ts   # 24 rules-engine assertions
npx tsx src/lib/ai/ai.test.ts         # AI self-play smoke test
npm run build                          # type-safe production build
```

## ⛓️ Go live on Base Sepolia (Inco)

```bash
cp .env.example .env.local
# fill DEPLOYER_PRIVATE_KEY (funded: https://www.alchemy.com/faucets/base-sepolia)
npm run inco:deploy                    # forge create (or Remix instructions)
# put the printed address into NEXT_PUBLIC_INCO_CONTRACT
# set NEXT_PUBLIC_INCO_MODE=live
npm run dev
```

## ▲ Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2FMEGAPOT-CHECKERS&env=NEXT_PUBLIC_INCO_MODE,NEXT_PUBLIC_CHAIN_ID,NEXT_PUBLIC_INCO_CONTRACT,NEXT_PUBLIC_RPC_URL)

1. Push this repo to GitHub, click the button (or `vercel deploy`).
2. Set the four `NEXT_PUBLIC_*` env vars (or none — demo mode works out of the box).
3. **Note on realtime:** the built-in room relay is in-memory (perfect for a single
   `next dev`/`next start` instance and for demos). On serverless Vercel, multiplayer
   across regions needs a durable channel — swap `src/lib/net/room-store.ts` for
   Upstash Redis pub/sub or PartyKit; the module's surface is 6 tiny functions and
   `src/lib/net/client.ts` needs no changes.

## 🕹️ Screenshots / GIFs

> Run `npm run dev` and visit: `/` (aurora landing) · `/play/local` (walnut board, monster-bite captures) · `/play/ai` (difficulty picker, thinking dots) · `/play/online` (lobby → **Seal your secrets** Inco ceremony → reveal & settle).
> Capture GIFs of a multi-jump (stacked CHOMP!s) and the king-crowning sparkle for the submission page.

## 🏗️ Architecture

```
src/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Landing
│   ├── play/{local,ai,online}/ # The three modes
│   └── api/room/…              # Create / join / SSE events / emit relay
├── components/
│   ├── board/                  # Board + PieceToken (Framer Motion everything)
│   ├── game/                   # HUD, controls, end-game modal, settings
│   ├── online/                 # Lobby, wallet, Web3Provider
│   └── ui/                     # Button, Modal, Switch, Segmented (custom shadcn-style)
├── lib/
│   ├── game/                   # Pure rules engine + tests (zero deps)
│   ├── ai/                     # Evaluation, minimax α-β, Web Worker host
│   ├── net/                    # Protocol, SSE client, room store, online hook
│   ├── inco/                   # Inco client wrapper, ABI, power assignment
│   └── sound.ts                # Procedural Web-Audio engine (zero assets)
├── store/                      # Zustand: game state + persisted settings
contracts/ConfidentialCheckers.sol   # Inco Lightning euint256 escrow
scripts/deploy-inco.mjs              # forge-based deploy helper
```

**Notable engineering choices**

- **Rules engine is pure and framework-free** — recursively enumerates capture sequences (mandatory-capture rule enforced globally), unit-tested standalone with `tsx`.
- **AI runs in a Web Worker** with a per-difficulty time budget, so a depth-7 search never drops a frame of animation.
- **Every remote move is re-validated** against the local engine before being applied — a malformed or illegal peer move is simply ignored.
- **Sounds are procedurally generated** (filtered-noise crunches, pitch-swept gulps) — zero audio files, zero network weight.
- **Pieces are alive**: desynchronised breathing, blinking eyes, eager wiggle when selected, squash-and-stretch on landing, panic-then-flattened exit under snapping cartoon jaws.

## 🏆 Hackathon Notes (Inco track)

**Where Inco is load-bearing in the core loop:**

1. **Commit phase (before move 1):** both players call `inco().encrypt()` (→ `@inco/js` `Lightning.encrypt` in live mode) for *stake* and *powerSeed*, and the ciphertext handles go on-chain via `openGame`/`joinGame` (`e.newEuint256(ciphertext, msg.sender)` + ACL `e.allow`). Gameplay literally cannot start until both encrypted commits are in — it's the matchmaking gate, not a side feature.
2. **During play:** the hidden-power layout derived from the encrypted seed changes capture risk/reward on every move; reveals fire only when pieces are eaten.
3. **End of game:** on-chain settle → trustless `claim()` → `revealStakes()` flips the handles to publicly decryptable → `attestedReveal()` returns covalidator-signed plaintext. The blind-bid reveal is the emotional payoff of every match.

**Why this needs Inco:** on a transparent chain both mechanics are broken by design — stakes are readable in calldata and any on-chain "hidden" layout can be read from state or ground offline. `euint256` + attested decryption gives *binding* commitments that are *actually secret*, with a verifiable reveal.

**Honest status:** the complete game + UX + contract + client SDK wiring are done; `mock` mode (default) simulates encryption locally so the full loop is demoable without a funded wallet, and `live` mode switches to real `@inco/js` calls (`baseSepoliaTestnet()`, `encrypt()`, `attestedReveal()`) against the deployed contract from `npm run inco:deploy`.

## 📜 License

MIT

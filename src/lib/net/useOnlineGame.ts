"use client";

import * as React from "react";
import { useGameStore } from "@/store/game-store";
import { legalMoves, samePos } from "@/lib/game/engine";
import type { Move, Player } from "@/lib/game/types";
import { RoomConnection } from "./client";
import { seatToPlayer, type RoomEvent, type RoomPlayer, type Seat } from "./protocol";
import { inco } from "@/lib/inco/client";
import { assignPowers } from "@/lib/inco/powers";
import { useWagerStore } from "@/lib/megapot/wager-store";
import { escrow } from "@/lib/megapot/escrow-client";
import { isEscrowLive, escrowConfig } from "@/lib/megapot/escrow-config";
import { sound } from "@/lib/sound";

export type OnlinePhase =
  | "lobby"
  | "waiting"
  | "committing"
  | "playing"
  | "ended";

export interface OnlineState {
  phase: OnlinePhase;
  busy: boolean;
  error: string | null;
  code: string;
  seat: Seat | null;
  mySide: Player;
  connected: boolean;
  players: RoomPlayer[];
  withPowers: boolean;
  wagerEnabled: boolean;
  /** Winner-takes-all stake in whole dollars (0 = friendly game). */
  stakeUsd: number;
  // Inco / wager
  myCommitted: boolean;
  oppCommitted: boolean;
  myStake: number;
  reveal: { mine?: number; theirs?: number } | null;
  settleTx: string | null;
  toast: { id: number; text: string; kind: "power" | "info" } | null;
  /** On-chain escrow game ID (set when escrow is live). */
  escrowGameId: bigint | null;
  /** Whether this match uses real USDC escrow. */
  escrowLive: boolean;
}

const initialInco = {
  myCommitted: false,
  oppCommitted: false,
  myStake: 0,
  reveal: null as OnlineState["reveal"],
  settleTx: null as string | null,
  toast: null as OnlineState["toast"],
  escrowGameId: null as bigint | null,
  escrowLive: isEscrowLive(),
};

export function useOnlineGame(walletClient?: import("viem").WalletClient | null) {
  const conn = React.useRef<RoomConnection | null>(null);
  const applyingRemote = React.useRef(false);
  const myPowerSeed = React.useRef<bigint>(0n);
  const escrowGameIdRef = React.useRef<bigint | null>(null);
  const [state, setState] = React.useState<OnlineState>({
    phase: "lobby",
    busy: false,
    error: null,
    code: "",
    seat: null,
    mySide: "red",
    connected: false,
    players: [],
    withPowers: true,
    wagerEnabled: true,
    stakeUsd: 0,
    ...initialInco,
  });
  const patch = (p: Partial<OnlineState>) => setState((s) => ({ ...s, ...p }));

  const gs = useGameStore;

  // ---- Emit my local moves to the peer ----
  React.useEffect(() => {
    const unsub = gs.subscribe((s, prev) => {
      if (s.lastMove === prev.lastMove) return;
      if (applyingRemote.current) return;
      if (!conn.current || state.seat === null) return;
      const move = s.lastMove;
      if (!move) return;
      // The side that just moved is the previous toMove.
      const mover = prev.toMove;
      if (mover !== state.mySide) return;
      const ply = s.moveNumber;
      conn.current.emit({ type: "move", move, by: state.seat, ply });
      // Note: captured pieces here belonged to the opponent — only the owner
      // knows their hidden powers, so the reveal comes from their side.
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.seat, state.mySide]);

  function handleEvent(ev: RoomEvent) {
    const s = () => useGameStore.getState();
    switch (ev.type) {
      case "hello": {
        patch({
          players: ev.snapshot.players,
          withPowers: ev.snapshot.withPowers,
          wagerEnabled: ev.snapshot.wagerEnabled,
          stakeUsd: ev.snapshot.stakeUsd ?? 0,
        });
        // Replay any moves we missed (reconnect).
        if (ev.snapshot.moves.length) {
          applyingRemote.current = true;
          for (const m of ev.snapshot.moves) s().commitMove(m.move);
          applyingRemote.current = false;
        }
        if (ev.snapshot.players.length === 2) {
          setState((st) =>
            st.phase === "waiting" || st.phase === "lobby"
              ? { ...st, phase: "committing" }
              : st,
          );
        }
        break;
      }
      case "peer-joined": {
        setState((st) => ({
          ...st,
          players: dedupePlayers([...st.players, { seat: ev.seat, name: ev.name, ready: false }]),
          phase: st.phase === "waiting" ? "committing" : st.phase,
        }));
        break;
      }
      case "peer-left":
        patch({ connected: true });
        pushToast("Opponent disconnected", "info");
        break;
      case "move": {
        // Apply the peer's move (validated against our engine).
        const st = s();
        const legal = legalMoves(st.board, st.toMove, st.rules);
        const match = legal.find(
          (m) =>
            samePos(m.from, ev.move.from) &&
            samePos(m.to, ev.move.to) &&
            m.captures.length === ev.move.captures.length,
        );
        if (match) {
          applyingRemote.current = true;
          st.commitMove(match);
          applyingRemote.current = false;
          // If the opponent captured one of MY powered pieces, reveal them.
          revealMyCaptured(match);
        }
        break;
      }
      case "reveal": {
        for (const rp of ev.powers) {
          if (rp.pieceId === "confidence") {
            // Opponent revealed their blind confidence bid (commit–reveal).
            const theirs = parseInt(rp.power, 10);
            setState((st) => ({
              ...st,
              reveal: { ...(st.reveal ?? {}), theirs },
            }));
          } else {
            pushToast(`Revealed: opponent's ${rp.power}!`, "power");
            sound.play("notify");
          }
        }
        break;
      }
      case "wager":
        patch({ oppCommitted: true });
        break;
      case "ready":
        setState((st) => {
          const players = st.players.map((p) =>
            p.seat === ev.by ? { ...p, ready: true } : p,
          );
          const bothReady = players.length === 2 && players.every((p) => p.ready);
          return {
            ...st,
            players,
            oppCommitted: ev.by !== st.seat ? true : st.oppCommitted,
            phase: bothReady ? "playing" : st.phase,
          };
        });
        break;
      case "settle": {
        // Mirror the terminal result locally (covers resigns & disconnect wins
        // reported by the peer) so the end-game modal opens on both clients.
        const st = s();
        if (st.result.kind === "playing") {
          st.setResult(
            ev.winner === "draw"
              ? { kind: "draw", reason: "agreement" }
              : { kind: "win", winner: ev.winner, reason: "resign" },
          );
        }
        patch({ phase: "ended" });
        break;
      }
    }
  }

  function revealMyCaptured(move: Move) {
    if (!state.withPowers || move.captures.length === 0) return;
    const revealed: { pieceId: string; power: string }[] = [];
    // `board` already has the captured pieces removed; check the pre-move
    // powered positions we tracked instead.
    for (const cap of move.captures) {
      const key = `${cap.row},${cap.col}`;
      const power = myPoweredPositions.current.get(key);
      if (power) {
        revealed.push({ pieceId: key, power });
        pushToast(`Your ${power} was captured!`, "power");
      }
    }
    if (revealed.length && conn.current && state.seat) {
      conn.current.emit({ type: "reveal", powers: revealed, by: state.seat });
    }
  }

  const myPoweredPositions = React.useRef(new Map<string, string>());

  let toastId = 0;
  function pushToast(text: string, kind: "power" | "info") {
    toastId++;
    patch({ toast: { id: Date.now() + toastId, text, kind } });
    setTimeout(() => setState((st) => (st.toast ? { ...st, toast: null } : st)), 3200);
  }

  // ---- Public actions ----
  async function create(opts: {
    name: string;
    withPowers: boolean;
    stakeUsd: number;
    address?: string;
  }) {
    patch({ busy: true, error: null });
    try {
      // Create on-chain escrow game if live and wager > 0
      let escrowId: bigint | null = null;
      if (isEscrowLive() && opts.stakeUsd > 0 && walletClient) {
        const result = await escrow().createGame(opts.stakeUsd, walletClient);
        escrowId = result.gameId;
        escrowGameIdRef.current = escrowId;
      }

      const { code } = await RoomConnection.create({
        name: opts.name,
        address: opts.address,
        withPowers: opts.withPowers,
        wagerEnabled: opts.stakeUsd > 0,
        stakeUsd: opts.stakeUsd,
        // Carried in the room so the guest can join the same on-chain game.
        escrowGameId: escrowId !== null ? String(escrowId) : undefined,
      });
      const c = new RoomConnection();
      conn.current = c;
      c.onEvent(handleEvent);
      c.onStatus((open) => patch({ connected: open }));
      c.connect(code, "host");
      useGameStore.getState().newGame({
        mode: "online",
        humanSide: "red",
        orientation: "red",
        withPowers: opts.withPowers,
        allowUndo: false,
      });
      patch({
        busy: false,
        phase: "waiting",
        code,
        seat: "host",
        mySide: "red",
        withPowers: opts.withPowers,
        wagerEnabled: opts.stakeUsd > 0,
        stakeUsd: opts.stakeUsd,
        players: [{ seat: "host", name: opts.name, ready: false }],
        escrowGameId: escrowId,
        escrowLive: isEscrowLive() && opts.stakeUsd > 0,
      });
    } catch (e) {
      patch({ busy: false, error: (e as Error).message });
    }
  }

  async function join(opts: { code: string; name: string; address?: string }) {
    patch({ busy: true, error: null });
    try {
      const { seat, snapshot } = await RoomConnection.join(opts.code, {
        name: opts.name,
        address: opts.address,
      });
      const c = new RoomConnection();
      conn.current = c;
      c.onEvent(handleEvent);
      c.onStatus((open) => patch({ connected: open }));
      c.connect(opts.code, seat);
      const side = seatToPlayer[seat];
      useGameStore.getState().newGame({
        mode: "online",
        humanSide: side,
        orientation: side,
        withPowers: snapshot.withPowers,
        allowUndo: false,
      });
      const joinStake = snapshot.stakeUsd ?? 0;
      const joinEscrowLive = isEscrowLive() && joinStake > 0;
      patch({
        busy: false,
        phase: snapshot.players.length >= 2 ? "committing" : "waiting",
        code: opts.code.toUpperCase(),
        seat,
        mySide: side,
        withPowers: snapshot.withPowers,
        wagerEnabled: snapshot.wagerEnabled,
        stakeUsd: joinStake,
        players: snapshot.players,
        escrowLive: joinEscrowLive,
        escrowGameId: snapshot.escrowGameId ? BigInt(snapshot.escrowGameId) : null,
      });
      if (snapshot.escrowGameId) {
        escrowGameIdRef.current = BigInt(snapshot.escrowGameId);
      }
    } catch (e) {
      patch({ busy: false, error: (e as Error).message });
    }
  }

  /**
   * One-shot match setup, fully automatic — no user input. Buys the entry
   * ticket from the demo bankroll, encrypts the stake + power seed with Inco
   * behind the scenes, and marks us ready.
   */
  async function commit() {
    if (!conn.current || !state.seat) return;

    // Rooms without Inco features (device pairing) skip the ceremony.
    if (!state.withPowers && !state.wagerEnabled) {
      conn.current.emit({ type: "ready", by: state.seat });
      setState((st) => {
        const players = st.players.map((p) =>
          p.seat === st.seat ? { ...p, ready: true } : p,
        );
        const bothReady =
          players.length === 2 && players.every((p) => p.ready);
        return {
          ...st,
          myCommitted: true,
          players,
          phase: bothReady ? "playing" : st.phase,
        };
      });
      return;
    }

    const stake = state.wagerEnabled ? state.stakeUsd : 0;
    patch({ busy: true, myStake: stake });

    // If escrow is live and we're the guest joining a wager game, join on-chain
    const gid = escrowGameIdRef.current ?? state.escrowGameId;
    if (state.escrowLive && gid && stake > 0 && state.seat === "guest" && walletClient) {
      try {
        await escrow().joinGame(gid, walletClient);
      } catch (e) {
        patch({ busy: false, error: (e as Error).message });
        return;
      }
    }

    // Buy the entry ticket from the demo bankroll when not using real escrow
    if (stake > 0 && !state.escrowLive) {
      let w = useWagerStore.getState();
      w.clear();
      while (useWagerStore.getState().bankroll < stake)
        useWagerStore.getState().topUp();
      w = useWagerStore.getState();
      w.buyEntry(stake);
    }

    const account =
      state.players.find((p) => p.seat === state.seat)?.address ??
      `0x${state.seat}`;
    // Encrypt the confidential stake + a power seed with Inco.
    const seed = BigInt(Math.floor(Math.random() * 2 ** 31));
    myPowerSeed.current = seed;
    const [stakeEnc] = await Promise.all([
      inco().encrypt(BigInt(stake), account),
      inco().encrypt(seed, account),
    ]);

    // Assign my hidden powers locally from the seed.
    if (state.withPowers) {
      const board = useGameStore.getState().board.map((r) => r.map((c) => (c ? { ...c } : null)));
      assignPowers(board, state.mySide, seed);
      myPoweredPositions.current.clear();
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++) {
          const p = board[r][c];
          if (p && p.player === state.mySide && p.power && p.power !== "none")
            myPoweredPositions.current.set(`${r},${c}`, p.power);
        }
      useGameStore.setState({ board });
    }

    conn.current.emit({
      type: "wager",
      stakeCommit: stakeEnc.commit,
      buyInWei: String(BigInt(stake) * 1_000_000n), // USDC 6-decimals
      by: state.seat,
    });
    conn.current.emit({ type: "ready", by: state.seat });
    setState((st) => {
      const players = st.players.map((p) =>
        p.seat === st.seat ? { ...p, ready: true } : p,
      );
      const bothReady = players.length === 2 && players.every((p) => p.ready);
      return {
        ...st,
        busy: false,
        myCommitted: true,
        players,
        phase: bothReady ? "playing" : st.phase,
      };
    });
  }

  async function reportWinner(winner: Player | "draw") {
    if (!conn.current || !state.seat) return;
    conn.current.emit({ type: "settle", winner });

    // Report winner on-chain via escrow if live
    const gid = escrowGameIdRef.current ?? state.escrowGameId;
    if (state.escrowLive && gid && walletClient?.account) {
      try {
        const winnerAddr: `0x${string}` =
          winner === "draw"
            ? "0x0000000000000000000000000000000000000000"
            : winner === state.mySide
              ? walletClient.account.address
              : (state.players.find((p) => p.seat !== state.seat)?.address as `0x${string}`) ??
                "0x0000000000000000000000000000000000000000";
        await escrow().reportWinner(gid, winnerAddr, walletClient);
      } catch (e) {
        console.error("Escrow reportWinner failed:", e);
      }
    }

    patch({ phase: "ended" });
  }

  async function revealStakes() {
    if (!conn.current || !state.seat) return;
    patch({ busy: true });

    const gid = escrowGameIdRef.current ?? state.escrowGameId;

    // If escrow is live, try to claim the pot on-chain
    if (state.escrowLive && gid && walletClient) {
      try {
        const claimHash = await escrow().claim(gid, walletClient);
        conn.current.emit({
          type: "reveal",
          powers: [{ pieceId: "confidence", power: String(state.myStake) }],
          by: state.seat,
        });
        patch({
          busy: false,
          settleTx: claimHash,
          reveal: { mine: state.myStake },
        });
        return;
      } catch (e) {
        // Claim may fail if we're not the winner or not yet settled — fall through
        console.error("Escrow claim:", e);
      }
    }

    // Fallback: demo mode reveal
    conn.current.emit({
      type: "reveal",
      powers: [{ pieceId: "confidence", power: String(state.myStake) }],
      by: state.seat,
    });
    const tx = `0x${Array.from({ length: 64 })
      .map(() => "0123456789abcdef"[Math.floor(Math.random() * 16)])
      .join("")}`;
    setTimeout(
      () =>
        patch({
          busy: false,
          settleTx: tx,
          reveal: { mine: state.myStake },
        }),
      700,
    );
  }

  function leave() {
    conn.current?.close();
    conn.current = null;
    patch({ phase: "lobby", seat: null, code: "" });
  }

  React.useEffect(() => () => conn.current?.close(), []);

  return { state, create, join, commit, reportWinner, revealStakes, leave, escrowLive: isEscrowLive() };
}

function dedupePlayers(players: RoomPlayer[]): RoomPlayer[] {
  const map = new Map<Seat, RoomPlayer>();
  for (const p of players) map.set(p.seat, p);
  return [...map.values()];
}


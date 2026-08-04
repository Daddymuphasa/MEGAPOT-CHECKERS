/// <reference lib="webworker" />
import { chooseMove } from "./minimax";
import type { Board, Difficulty, Player, RulesOptions } from "../game/types";

export interface AIRequest {
  id: number;
  board: Board;
  player: Player;
  difficulty: Difficulty;
  opts: RulesOptions;
}

self.onmessage = (e: MessageEvent<AIRequest>) => {
  const { id, board, player, difficulty, opts } = e.data;
  const started = performance.now();
  const result = chooseMove(board, player, difficulty, opts);
  const elapsed = performance.now() - started;
  // Guarantee a minimum "thinking" time so the indicator reads naturally.
  const minThink = difficulty === "hard" ? 550 : 350;
  const wait = Math.max(0, minThink - elapsed);
  setTimeout(() => self.postMessage({ id, ...result }), wait);
};

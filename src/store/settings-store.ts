"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light";
export type BoardSkin = "walnut" | "marble" | "neon" | "chrome";
export type PieceSkin = "classic" | "modern" | "gem" | "chrome";

interface SettingsState {
  theme: Theme;
  sound: boolean;
  haptics: boolean;
  boardSkin: BoardSkin;
  pieceSkin: PieceSkin;
  showHints: boolean;
  showCoords: boolean;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark",
      sound: true,
      haptics: true,
      boardSkin: "chrome",
      pieceSkin: "chrome",
      showHints: true,
      showCoords: true,
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      setTheme: (t) => set({ theme: t }),
      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
    }),
    {
      name: "megapot-settings",
      partialize: (s) => ({
        theme: s.theme,
        sound: s.sound,
        haptics: s.haptics,
        boardSkin: s.boardSkin,
        pieceSkin: s.pieceSkin,
        showHints: s.showHints,
        showCoords: s.showCoords,
      }),
    },
  ),
);

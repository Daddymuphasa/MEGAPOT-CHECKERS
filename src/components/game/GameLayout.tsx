"use client";

import * as React from "react";
import { AuroraBackground } from "@/components/layout/AuroraBackground";
import { TopBar } from "@/components/layout/TopBar";

interface GameLayoutProps {
  board: React.ReactNode;
  topPlayer: React.ReactNode;
  bottomPlayer: React.ReactNode;
  side: React.ReactNode;
  title?: string;
}

export function GameLayout({
  board,
  topPlayer,
  bottomPlayer,
  side,
  title,
}: GameLayoutProps) {
  return (
    <main className="relative flex min-h-dvh flex-col">
      <AuroraBackground />
      <TopBar title={title} />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center gap-6 px-4 py-4 lg:flex-row lg:items-start lg:justify-center lg:gap-10 lg:py-8">
        <div className="flex w-full max-w-[min(90vw,560px)] flex-col gap-3">
          {topPlayer}
          {board}
          {bottomPlayer}
        </div>
        <aside className="w-full space-y-4 lg:sticky lg:top-24 lg:w-80">
          {side}
        </aside>
      </div>
    </main>
  );
}

"use client";

import { motion } from "framer-motion";
import { Users, Bot, Globe2, Shield, Sparkles } from "lucide-react";
import { AuroraBackground } from "@/components/layout/AuroraBackground";
import { Logo } from "@/components/layout/Logo";
import { ModeCard } from "@/components/home/ModeCard";
import { SettingsMenu } from "@/components/game/SettingsMenu";
import { Badge } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col">
      <AuroraBackground />

      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <Logo className="h-9 w-9" />
          <span className="font-display text-lg font-bold">Megapot</span>
        </div>
        <SettingsMenu />
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-5 pb-16 pt-8 text-center sm:pt-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120 }}
        >
          <Badge className="mb-6 border-brand/30 bg-brand/10 text-brand">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by Inco Lightning · Base
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, type: "spring", stiffness: 110 }}
          className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl"
        >
          Checkers,
          <br />
          <span className="text-gradient">reimagined.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mt-6 max-w-xl text-balance text-lg text-muted"
        >
          Buttery-smooth animations, a sharp AI, and the first checkers with{" "}
          <span className="text-text">confidential wagers</span> — your stake
          stays encrypted until the final crown falls.
        </motion.p>

        <div className="mt-12 grid w-full gap-5 sm:grid-cols-3">
          <ModeCard
            index={0}
            href="/play/local"
            title="Local & Bluetooth"
            description="Two players, one device — or pair over Bluetooth / QR for a couch-to-couch match."
            icon={<Users className="h-7 w-7" />}
            accent="linear-gradient(145deg,#7c5cf6,#6366f1)"
          />
          <ModeCard
            index={1}
            href="/play/ai"
            title="Play vs AI"
            description="Face a minimax engine with alpha-beta pruning. Easy to warm up, Hard to humble you."
            icon={<Bot className="h-7 w-7" />}
            accent="linear-gradient(145deg,#22d3ee,#0ea5e9)"
          />
          <ModeCard
            index={2}
            href="/play/online"
            title="Online + Inco"
            description="Matchmake by room code, wager privately, and settle trustlessly on-chain."
            icon={<Globe2 className="h-7 w-7" />}
            accent="linear-gradient(145deg,#f472b6,#db2777)"
            tag="Private"
          />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted"
        >
          <span className="inline-flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-brand-3" /> Encrypted stakes
          </span>
          <span>·</span>
          <span>Mandatory captures & flying kings</span>
          <span>·</span>
          <span>Keyboard & screen-reader friendly</span>
        </motion.div>
      </section>
    </main>
  );
}

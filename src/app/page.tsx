"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Bot, Globe2, Swords, Trophy, Zap, Shield } from "lucide-react";
import { AuroraBackground } from "@/components/layout/AuroraBackground";
import { Logo } from "@/components/layout/Logo";
import { JackpotWidget } from "@/components/megapot/JackpotWidget";
import { SettingsMenu } from "@/components/game/SettingsMenu";
import { ConnectWallet } from "@/components/megapot/ConnectWallet";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col">
      <AuroraBackground />
      <FloatingPieces />

      <header className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <Logo className="h-9 w-9" />
          <span className="font-display text-lg font-bold tracking-wide">
            Megapot
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ConnectWallet />
          <SettingsMenu />
        </div>
      </header>

      {/* Main content — two-column on desktop, stacked on mobile */}
      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center justify-center gap-8 px-5 pb-12 pt-4 max-lg:flex-col lg:gap-12 lg:px-10">
        {/* Left column — hero + play modes */}
        <div className="flex w-full max-w-lg flex-col items-center lg:items-start">
          {/* Hero card */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 18 }}
            className="glass-hero relative w-full overflow-hidden rounded-3xl p-8 text-center sm:p-10"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-6 h-48 w-48 -translate-x-1/2 rounded-full opacity-70 blur-[80px] animate-neon-pulse"
              style={{
                background:
                  "radial-gradient(circle, rgba(124,92,246,0.6), rgba(34,211,238,0.2), transparent)",
              }}
            />
            <Sparkles />

            <motion.div
              animate={{ rotate: [0, 3, -3, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            >
              <Logo className="mx-auto h-20 w-20 drop-shadow-[0_0_40px_rgba(124,92,246,0.6)] sm:h-24 sm:w-24" />
            </motion.div>

            <h1 className="mt-3 font-display text-5xl font-black tracking-tight sm:text-6xl">
              <span className="text-chrome animate-neon-pulse">CHECKERS</span>
            </h1>

            <p className="mt-2 flex items-center justify-center gap-2 text-sm text-muted">
              <Swords className="h-4 w-4 text-brand" />
              Wager · Battle · Win big
              <Trophy className="h-4 w-4 text-gold" />
            </p>

            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div
                className="absolute inset-y-0 w-1/3 opacity-[0.07]"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, white, transparent)",
                  animation: "shimmer-sweep 4s ease-in-out infinite",
                }}
              />
            </div>
          </motion.div>

          {/* Game mode cards */}
          <div className="mt-6 grid w-full gap-4 sm:grid-cols-2">
            <ModeCard
              href="/play/ai"
              icon={<Bot className="h-6 w-6" />}
              title="Player vs AI"
              desc="Challenge the engine on Easy or Hard"
              accentColor="rgba(124, 92, 246, 0.5)"
              badge="HOT"
              delay={0.2}
              features={["Two difficulties", "Wager mode", "Instant match"]}
            />
            <ModeCard
              href="/play/online"
              icon={<Globe2 className="h-6 w-6" />}
              title="Online PvP"
              desc="Create a room or join with a code"
              accentColor="rgba(34, 211, 238, 0.5)"
              badge="LIVE"
              delay={0.3}
              features={["Private rooms", "Room codes", "Real-time play"]}
            />
          </div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start"
          >
            {[
              { icon: <Zap className="h-3 w-3" />, label: "Instant wagers" },
              { icon: <Shield className="h-3 w-3" />, label: "Hidden powers" },
              { icon: <Trophy className="h-3 w-3" />, label: "Daily jackpot" },
            ].map((f) => (
              <span
                key={f.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/50"
              >
                {f.icon}
                {f.label}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Right column — Jackpot widget (side panel on desktop) */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35, type: "spring", stiffness: 100 }}
          className="w-full max-w-lg lg:max-w-sm lg:self-center"
        >
          <JackpotWidget className="w-full" />

          {/* Stats row under jackpot */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatPill label="Players" value="420+" />
            <StatPill label="Matches" value="1.2K" />
            <StatPill label="Won" value="$8.4K" />
          </div>
        </motion.div>
      </section>
    </main>
  );
}

function ModeCard({
  href,
  icon,
  title,
  desc,
  accentColor,
  badge,
  delay,
  features,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  accentColor: string;
  badge?: string;
  delay: number;
  features: string[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 120 }}
    >
      <Link href={href} className="group block">
        <motion.div
          whileHover={{ scale: 1.03, y: -4 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="glass-hero relative flex h-full flex-col overflow-hidden rounded-2xl p-5 transition-all hover:border-white/20"
        >
          {/* Top glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-0 blur-3xl transition-opacity group-hover:opacity-40"
            style={{ background: accentColor.replace("0.5", "0.8") }}
          />

          {/* Accent bar */}
          <div
            className="absolute left-0 top-0 h-full w-1 rounded-l-2xl opacity-60 group-hover:opacity-100 transition-opacity"
            style={{ background: accentColor.replace("0.5", "0.9") }}
          />

          {/* Header */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all group-hover:shadow-[0_0_20px_-4px_var(--glow)]"
              style={{
                background: accentColor.replace("0.5", "0.15"),
                "--glow": accentColor,
              } as React.CSSProperties}
            >
              {icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-bold">
                  {title}
                </span>
                {badge && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest animate-pulse"
                    style={{
                      background: accentColor.replace("0.5", "0.2"),
                      color: accentColor.replace("0.5", "1"),
                      boxShadow: `0 0 10px -2px ${accentColor}`,
                    }}
                  >
                    {badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">{desc}</p>
            </div>
          </div>

          {/* Feature list */}
          <ul className="mt-3 space-y-1">
            {features.map((f) => (
              <li
                key={f}
                className="flex items-center gap-2 text-[11px] text-white/40"
              >
                <span
                  className="h-1 w-1 rounded-full"
                  style={{ background: accentColor.replace("0.5", "0.7") }}
                />
                {f}
              </li>
            ))}
          </ul>

          {/* Hover shimmer */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
            <div
              className="absolute inset-y-0 w-1/4 opacity-[0.1]"
              style={{
                background:
                  "linear-gradient(90deg, transparent, white, transparent)",
                animation: "shimmer-sweep 2s ease-in-out infinite",
              }}
            />
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-pill flex flex-col items-center rounded-xl px-3 py-2.5 text-center">
      <span className="text-base font-bold tabular-nums text-white/90">
        {value}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
    </div>
  );
}

function FloatingPieces() {
  const pieces = [
    { x: "8%", y: "18%", size: 44, color: "#c8b0b0", delay: 0, dur: 6 },
    { x: "85%", y: "22%", size: 36, color: "#a0a8b8", delay: -2, dur: 7 },
    { x: "12%", y: "72%", size: 28, color: "#a0a8b8", delay: -4, dur: 5.5 },
    { x: "88%", y: "65%", size: 40, color: "#c8b0b0", delay: -1, dur: 6.5 },
    { x: "25%", y: "88%", size: 22, color: "#c8b0b0", delay: -3, dur: 5 },
    { x: "72%", y: "85%", size: 30, color: "#a0a8b8", delay: -5, dur: 7.5 },
    { x: "50%", y: "12%", size: 24, color: "#c8b0b0", delay: -6, dur: 6.2 },
  ];

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {pieces.map((p, i) => (
        <div
          key={i}
          className="absolute animate-float-piece"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        >
          <div
            className="h-full w-full rounded-full opacity-20"
            style={{
              background: `radial-gradient(ellipse 60% 40% at 35% 28%, rgba(255,255,255,.4), transparent),
                           linear-gradient(155deg, ${p.color} 0%, ${p.color}88 50%, ${p.color}44 100%)`,
              border: "1px solid rgba(255,255,255,.1)",
              boxShadow: `0 0 ${p.size}px rgba(124,92,246,.15), inset 0 0 ${p.size / 3}px rgba(255,255,255,.1)`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

function Sparkles() {
  const sparks = Array.from({ length: 6 }, (_, i) => ({
    left: `${15 + i * 14}%`,
    top: `${20 + (i % 3) * 25}%`,
    delay: i * 0.8,
    size: 2 + (i % 3),
  }));

  return (
    <div className="pointer-events-none absolute inset-0">
      {sparks.map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: s.size,
            height: s.size,
            left: s.left,
            top: s.top,
            boxShadow: "0 0 6px 2px rgba(255,255,255,.4)",
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 2.5,
            delay: s.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

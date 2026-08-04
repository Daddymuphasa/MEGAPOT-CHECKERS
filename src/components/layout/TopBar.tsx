"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsMenu } from "@/components/game/SettingsMenu";
import { useSettings } from "@/store/settings-store";
import { Logo } from "./Logo";

export function TopBar({ title, back = "/" }: { title?: string; back?: string }) {
  const sound = useSettings((s) => s.sound);
  const setSound = useSettings((s) => s.set);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <div className="flex items-center gap-2">
        <Link href={back} aria-label="Back">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-7 w-7" />
          <span className="hidden font-display text-lg font-bold sm:block">
            {title ?? "Megapot Checkers"}
          </span>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <Button
          variant="secondary"
          size="icon"
          aria-label={sound ? "Mute" : "Unmute"}
          onClick={() => setSound("sound", !sound)}
        >
          {sound ? (
            <Volume2 className="h-5 w-5" />
          ) : (
            <VolumeX className="h-5 w-5" />
          )}
        </Button>
        <SettingsMenu />
      </motion.div>
    </header>
  );
}

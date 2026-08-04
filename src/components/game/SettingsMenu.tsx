"use client";

import * as React from "react";
import { Settings2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import {
  useSettings,
  type BoardSkin,
  type PieceSkin,
} from "@/store/settings-store";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-muted">{label}</span>
      {children}
    </div>
  );
}

export function SettingsMenu() {
  const [open, setOpen] = React.useState(false);
  const s = useSettings();

  return (
    <>
      <Button
        variant="secondary"
        size="icon"
        aria-label="Settings"
        onClick={() => setOpen(true)}
      >
        <Settings2 className="h-5 w-5" />
      </Button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <h3 className="font-display text-xl font-semibold">Settings</h3>
        <div className="mt-3 divide-y divide-border">
          <Row label="Theme">
            <Segmented
              layoutId="set-theme"
              size="sm"
              value={s.theme}
              onChange={(v) => s.setTheme(v)}
              options={[
                { value: "dark", label: "Dark" },
                { value: "light", label: "Light" },
              ]}
            />
          </Row>
          <Row label="Sound effects">
            <Switch checked={s.sound} onChange={(v) => s.set("sound", v)} />
          </Row>
          <Row label="Haptics (mobile)">
            <Switch checked={s.haptics} onChange={(v) => s.set("haptics", v)} />
          </Row>
          <Row label="Move hints">
            <Switch checked={s.showHints} onChange={(v) => s.set("showHints", v)} />
          </Row>
          <Row label="Coordinates">
            <Switch
              checked={s.showCoords}
              onChange={(v) => s.set("showCoords", v)}
            />
          </Row>
          <Row label="Board">
            <Segmented<BoardSkin>
              layoutId="set-board"
              size="sm"
              value={s.boardSkin}
              onChange={(v) => s.set("boardSkin", v)}
              options={[
                { value: "walnut", label: "Walnut" },
                { value: "marble", label: "Marble" },
                { value: "neon", label: "Neon" },
              ]}
            />
          </Row>
          <Row label="Pieces">
            <Segmented<PieceSkin>
              layoutId="set-piece"
              size="sm"
              value={s.pieceSkin}
              onChange={(v) => s.set("pieceSkin", v)}
              options={[
                { value: "classic", label: "Classic" },
                { value: "modern", label: "Modern" },
                { value: "gem", label: "Gem" },
              ]}
            />
          </Row>
        </div>
      </Modal>
    </>
  );
}

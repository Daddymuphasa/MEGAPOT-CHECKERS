"use client";

import * as React from "react";
import QRCode from "qrcode";
import { motion } from "framer-motion";
import { Bluetooth, QrCode, Loader2, Wifi } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Device-to-device pairing panel.
 *
 * Web Bluetooth cannot connect two browsers directly (it is central→peripheral
 * only), so true BT PvP is not possible on the open web. We therefore pair via
 * QR code / short room code and run moves over the same real-time channel used
 * by online play (SSE relay, WebRTC-upgradable). On devices that support Web
 * Bluetooth we still surface a "nearby" hint via availability detection.
 */
export function PairPanel({
  code,
  joinUrl,
  connected,
  onStartHotseat,
}: {
  code: string | null;
  joinUrl: string | null;
  connected: boolean;
  onStartHotseat: () => void;
}) {
  const [qr, setQr] = React.useState<string | null>(null);
  const [btAvailable, setBtAvailable] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!joinUrl) return;
    QRCode.toDataURL(joinUrl, {
      width: 240,
      margin: 1,
      color: { dark: "#ffffff", light: "#00000000" },
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [joinUrl]);

  React.useEffect(() => {
    const nav = navigator as Navigator & {
      bluetooth?: { getAvailability?: () => Promise<boolean> };
    };
    nav.bluetooth
      ?.getAvailability?.()
      .then((v) => setBtAvailable(v))
      .catch(() => {});
  }, []);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <QrCode className="h-5 w-5 text-brand" />
        <h3 className="font-display font-semibold">Pair a second device</h3>
      </div>

      {code ? (
        <div className="mt-4 flex flex-col items-center">
          {qr ? (
            <motion.img
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              src={qr}
              alt={`QR code to join room ${code}`}
              className="rounded-xl border border-border bg-surface-2/40 p-2"
              width={200}
              height={200}
            />
          ) : (
            <div className="skeleton h-[200px] w-[200px]" />
          )}
          <div className="mt-3 font-mono text-2xl font-bold tracking-[0.3em]">
            {code}
          </div>
          <p className="mt-2 text-center text-xs text-muted">
            Scan with the other device, or open{" "}
            <span className="text-text">/play/online</span> and enter the code.
          </p>
          <div
            className={cn(
              "mt-3 flex items-center gap-1.5 text-xs",
              connected ? "text-good" : "text-warn",
            )}
          >
            {connected ? (
              <>
                <Wifi className="h-3.5 w-3.5" /> Channel live
              </>
            ) : (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for
                pair…
              </>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">
          Generate a pairing code to play across two devices on the same table
          — moves sync in real time.
        </p>
      )}

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-xs text-muted">
        <Bluetooth
          className={cn(
            "h-4 w-4",
            btAvailable ? "text-brand-3" : "opacity-40",
          )}
        />
        {btAvailable
          ? "Bluetooth detected — QR pairing recommended (browser BT is central-only)"
          : "Bluetooth unavailable in this browser — QR pairing active"}
      </div>

      <Button variant="ghost" size="sm" className="mt-3" onClick={onStartHotseat}>
        Just share this screen instead
      </Button>
    </Card>
  );
}

"use client";

/** Deep-space backdrop with diagonal tartan weave, floating glass bubbles, and ambient blobs. */
export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base colour */}
      <div className="absolute inset-0 bg-[#06070e]" />

      {/* ── Diagonal tartan / plaid weave ───────────────────────────── */}
      {/* Layer 1 — large diagonal windowpane grid */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 58px,
              rgba(124,92,246,.6) 58px,
              rgba(124,92,246,.6) 60px,
              transparent 60px,
              transparent 62px,
              rgba(124,92,246,.3) 62px,
              rgba(124,92,246,.3) 63px
            ),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 58px,
              rgba(34,211,238,.5) 58px,
              rgba(34,211,238,.5) 60px,
              transparent 60px,
              transparent 62px,
              rgba(34,211,238,.25) 62px,
              rgba(34,211,238,.25) 63px
            )
          `,
        }}
      />

      {/* Layer 2 — medium tartan bands (thicker, softer) */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 28px,
              rgba(200,200,240,.5) 28px,
              rgba(200,200,240,.5) 32px,
              transparent 32px
            ),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 28px,
              rgba(200,200,240,.4) 28px,
              rgba(200,200,240,.4) 32px,
              transparent 32px
            )
          `,
        }}
      />

      {/* Layer 3 — fine houndstooth-inspired checkerboard texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(45deg, rgba(255,255,255,.5) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(255,255,255,.5) 75%),
            linear-gradient(-45deg, rgba(255,255,255,.5) 25%, transparent 25%),
            linear-gradient(-45deg, transparent 75%, rgba(255,255,255,.5) 75%)
          `,
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 10px 10px, 10px 0, 0 10px",
        }}
      />

      {/* Layer 4 — horizontal accent pinstripes for depth */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 120px,
              rgba(245,194,66,.4) 120px,
              rgba(245,194,66,.4) 121px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 120px,
              rgba(245,194,66,.3) 120px,
              rgba(245,194,66,.3) 121px
            )
          `,
        }}
      />

      {/* ── Ambient gradient blobs (on top of pattern) ──────────── */}
      <div
        className="absolute -left-1/4 -top-1/3 h-[70vh] w-[70vh] rounded-full opacity-40 blur-[120px] animate-aurora"
        style={{ background: "radial-gradient(circle,rgba(124,92,246,.6),transparent 60%)" }}
      />
      <div
        className="absolute -right-1/4 top-1/4 h-[60vh] w-[60vh] rounded-full opacity-30 blur-[100px] animate-aurora"
        style={{
          background: "radial-gradient(circle,rgba(34,211,238,.4),transparent 60%)",
          animationDelay: "-6s",
        }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-[55vh] w-[55vh] rounded-full opacity-25 blur-[100px] animate-aurora"
        style={{
          background: "radial-gradient(circle,rgba(244,114,182,.35),transparent 60%)",
          animationDelay: "-12s",
        }}
      />

      {/* Floating glass bubbles */}
      <Bubble size={180} top="8%" left="6%" delay={0} />
      <Bubble size={120} top="15%" right="10%" delay={-3} />
      <Bubble size={90} top="55%" left="12%" delay={-7} />
      <Bubble size={140} top="60%" right="5%" delay={-4} />
      <Bubble size={60} top="35%" left="80%" delay={-9} />
      <Bubble size={45} top="80%" left="25%" delay={-2} />
      <Bubble size={70} top="20%" left="45%" delay={-11} />
      <Bubble size={100} top="75%" right="20%" delay={-6} />

      {/* Bokeh dots */}
      <div className="absolute right-[15%] top-[10%] h-2 w-2 rounded-full bg-brand/60 blur-[1px] animate-float" />
      <div className="absolute left-[20%] top-[70%] h-1.5 w-1.5 rounded-full bg-gold/50 blur-[1px] animate-float" style={{ animationDelay: "-3s" }} />
      <div className="absolute right-[30%] bottom-[15%] h-2.5 w-2.5 rounded-full bg-brand-3/40 blur-[1px] animate-float" style={{ animationDelay: "-7s" }} />
    </div>
  );
}

function Bubble({
  size,
  top,
  left,
  right,
  delay,
}: {
  size: number;
  top: string;
  left?: string;
  right?: string;
  delay: number;
}) {
  return (
    <div
      className="absolute animate-float"
      style={{
        width: size,
        height: size,
        top,
        left,
        right,
        animationDelay: `${delay}s`,
        animationDuration: `${6 + Math.abs(delay) * 0.3}s`,
      }}
    >
      <div
        className="h-full w-full rounded-full"
        style={{
          background: `radial-gradient(ellipse 50% 40% at 35% 30%, rgba(255,255,255,0.25), transparent),
                       radial-gradient(ellipse 60% 50% at 60% 70%, rgba(180,200,255,0.08), transparent),
                       radial-gradient(circle at 50% 50%, rgba(140,160,220,0.06), transparent)`,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: `inset 0 0 ${size / 3}px rgba(255,255,255,0.05),
                      0 0 ${size / 2}px rgba(140,160,220,0.04)`,
          backdropFilter: "blur(2px)",
        }}
      />
    </div>
  );
}

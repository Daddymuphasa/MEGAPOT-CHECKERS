"use client";

/** Ambient animated gradient blobs + grid — the premium backdrop. */
export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-bg" />
      <div
        className="absolute -left-1/4 -top-1/3 h-[70vh] w-[70vh] rounded-full opacity-60 blur-3xl animate-aurora"
        style={{ background: "radial-gradient(circle,rgb(124 92 246/.55),transparent 60%)" }}
      />
      <div
        className="absolute -right-1/4 top-1/4 h-[60vh] w-[60vh] rounded-full opacity-50 blur-3xl animate-aurora"
        style={{
          background: "radial-gradient(circle,rgb(34 211 238/.45),transparent 60%)",
          animationDelay: "-6s",
        }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-[55vh] w-[55vh] rounded-full opacity-40 blur-3xl animate-aurora"
        style={{
          background: "radial-gradient(circle,rgb(244 114 182/.4),transparent 60%)",
          animationDelay: "-12s",
        }}
      />
      <div className="absolute inset-0 bg-grid" />
    </div>
  );
}

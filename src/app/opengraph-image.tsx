import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Megapot Checkers — play checkers for real USDC on Base";

const GOLD = "#F5C242";
const BG = "#08090f";

/** Link-preview card. Generated at build time, so it needs no image assets. */
export default function OpengraphImage() {
  // 4x4 checkerboard motif. Pieces sit on dark squares, as they do in play:
  // index 6 is row 1 / col 2, index 9 is row 2 / col 1 — both (row+col) odd.
  const squares = Array.from({ length: 16 }, (_, i) => {
    const row = Math.floor(i / 4);
    const col = i % 4;
    return { dark: (row + col) % 2 === 1, i };
  });
  const GOLD_PIECE = 6;
  const RED_PIECE = 9;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: BG,
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* gold glow */}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -140,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: "rgba(245,194,66,0.16)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -220,
            left: -120,
            width: 480,
            height: 480,
            borderRadius: 9999,
            background: "rgba(245,194,66,0.08)",
          }}
        />

        <div
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 76px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 660 }}>
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                border: `2px solid ${GOLD}`,
                color: GOLD,
                borderRadius: 9999,
                padding: "8px 22px",
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: 2,
                marginBottom: 30,
              }}
            >
              ON BASE · REAL USDC
            </div>

            <div
              style={{
                fontSize: 92,
                fontWeight: 800,
                color: "#fff",
                lineHeight: 1.02,
                letterSpacing: -2,
              }}
            >
              Megapot
            </div>
            <div
              style={{
                fontSize: 92,
                fontWeight: 800,
                color: GOLD,
                lineHeight: 1.02,
                letterSpacing: -2,
                marginBottom: 26,
              }}
            >
              Checkers
            </div>

            <div style={{ fontSize: 31, color: "#9aa3b2", lineHeight: 1.35 }}>
              Play the AI free. Or stake real USDC and
              take the pot — settled by contract on Base.
            </div>
          </div>

          {/* board */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              // Satori sizes with border-box, so add the border to the box or
              // the fourth column overflows and wraps.
              width: 372 + 6,
              height: 372 + 6,
              borderRadius: 22,
              overflow: "hidden",
              border: `3px solid rgba(245,194,66,0.45)`,
            }}
          >
            {squares.map(({ dark, i }) => (
              <div
                key={i}
                style={{
                  width: 93,
                  height: 93,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: dark ? "#11151e" : "#283145",
                }}
              >
                {i === GOLD_PIECE || i === RED_PIECE ? (
                  <div
                    style={{
                      width: 62,
                      height: 62,
                      borderRadius: 9999,
                      background: i === GOLD_PIECE ? GOLD : "#e2564d",
                      border: "4px solid rgba(0,0,0,0.35)",
                    }}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}

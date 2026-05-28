import { ImageResponse } from "next/og";
import { getModel } from "@/lib/models";
import type { Category } from "@/lib/types";

export const runtime = "edge";

const SIZE = { width: 1200, height: 630 };

const ACCENT: Record<Category, string> = {
  kiss: "#d946ef",
  marry: "#ffb547",
  kill: "#ff3a3a",
};

/**
 * Personalised "Vote Card" share image.
 *
 * GET /api/share/og?kiss=grok&marry=claude&kill=copilot
 *
 * Note: Satori (next/og's renderer) requires explicit `display: flex` on
 * every div with more than one child — that's why every container below
 * spells it out.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const kissSlug = url.searchParams.get("kiss") ?? "";
  const marrySlug = url.searchParams.get("marry") ?? "";
  const killSlug = url.searchParams.get("kill") ?? "";

  const picks: Array<{ cat: Category; slug: string; name: string; color: string }> = [
    {
      cat: "kiss",
      slug: kissSlug,
      name: getModel(kissSlug)?.name ?? "—",
      color: getModel(kissSlug)?.color ?? "#666",
    },
    {
      cat: "marry",
      slug: marrySlug,
      name: getModel(marrySlug)?.name ?? "—",
      color: getModel(marrySlug)?.color ?? "#666",
    },
    {
      cat: "kill",
      slug: killSlug,
      name: getModel(killSlug)?.name ?? "—",
      color: getModel(killSlug)?.color ?? "#666",
    },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 56,
          background:
            "linear-gradient(135deg, #1a0510 0%, #08080c 50%, #1a0707 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Glow blobs */}
        <div
          style={{
            position: "absolute",
            top: -200,
            left: -100,
            width: 700,
            height: 500,
            background: "radial-gradient(circle, #d946ef55 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -150,
            right: -100,
            width: 600,
            height: 400,
            background: "radial-gradient(circle, #ffb54744 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -200,
            left: 200,
            width: 800,
            height: 500,
            background: "radial-gradient(circle, #ff3a3a55 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex" }}>
              <Dot color={ACCENT.kiss} />
              <Dot color={ACCENT.marry} offset={-12} />
              <Dot color={ACCENT.kill} offset={-12} />
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.85)",
              }}
            >
              KMK.ai
            </div>
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 18px",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 999,
              fontSize: 20,
              fontWeight: 600,
              color: "rgba(255,255,255,0.75)",
            }}
          >
            my picks
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 52,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: -2,
              color: "white",
            }}
          >
            Kiss.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 52,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: -2,
              background: `linear-gradient(90deg, ${ACCENT.kiss}, ${ACCENT.marry}, ${ACCENT.kill})`,
              backgroundClip: "text",
              color: "transparent",
              marginTop: 4,
            }}
          >
            Marry. Kill.
          </div>
        </div>

        {/* Picks list */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: 28,
          }}
        >
          {picks.map((p) => (
            <div
              key={p.cat}
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${ACCENT[p.cat]}40`,
                borderRadius: 18,
                padding: "12px 22px",
                gap: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 100,
                  padding: "6px 0",
                  borderRadius: 999,
                  fontSize: 16,
                  fontWeight: 900,
                  letterSpacing: 4,
                  textTransform: "uppercase",
                  background: `${ACCENT[p.cat]}1a`,
                  color: ACCENT[p.cat],
                  border: `1px solid ${ACCENT[p.cat]}40`,
                }}
              >
                {p.cat}
              </div>
              <div
                style={{
                  display: "flex",
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: p.color,
                  boxShadow: `0 0 24px ${p.color}`,
                }}
              />
              <div
                style={{
                  display: "flex",
                  fontSize: 38,
                  fontWeight: 900,
                  letterSpacing: -1,
                  color: "white",
                }}
              >
                {p.name}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "auto",
            paddingTop: 24,
            color: "rgba(255,255,255,0.5)",
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          <div style={{ display: "flex" }}>cast your votes at kmk.ai</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.05)",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            powered by VLS + BG8
          </div>
        </div>
      </div>
    ),
    SIZE,
  );
}

function Dot({ color, offset = 0 }: { color: string; offset?: number }) {
  return (
    <div
      style={{
        display: "flex",
        width: 22,
        height: 22,
        borderRadius: 999,
        background: color,
        boxShadow: `0 0 20px ${color}`,
        marginLeft: offset,
      }}
    />
  );
}

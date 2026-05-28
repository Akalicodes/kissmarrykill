import { ImageResponse } from "next/og";
import { MODEL_BY_SLUG } from "@/lib/models";
import type { Category } from "@/lib/types";

export const runtime = "edge";

const SIZE = { width: 1200, height: 630 };

const ACCENT: Record<Category, string> = {
  kiss: "#d946ef",
  marry: "#ffb547",
  kill: "#ff3a3a",
};

/**
 * Per-model profile OG image. Edge runtime — no live data dependency.
 * Live ranks live on the profile page itself; this image is the
 * "brand card" you see when the link is shared.
 *
 * GET /api/model/og?slug=claude
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") ?? "";
  const m = MODEL_BY_SLUG[slug];

  if (!m) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            background: "#08080c",
            color: "white",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, sans-serif",
            fontSize: 48,
            fontWeight: 800,
          }}
        >
          unknown model
        </div>
      ),
      SIZE,
    );
  }

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
            "linear-gradient(135deg, #0a0a14 0%, #08080c 50%, #100a14 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Model-coloured halo */}
        <div
          style={{
            position: "absolute",
            top: -250,
            right: -150,
            width: 900,
            height: 600,
            background: `radial-gradient(circle, ${m.color}55 0%, transparent 70%)`,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -200,
            left: -100,
            width: 700,
            height: 500,
            background: `radial-gradient(circle, ${m.color}33 0%, transparent 70%)`,
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
              alignItems: "center",
              padding: "10px 18px",
              border: `1px solid ${m.color}66`,
              borderRadius: 999,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
              background: `${m.color}1a`,
              color: m.color,
            }}
          >
            {m.org}
          </div>
        </div>

        {/* Section label */}
        <div
          style={{
            display: "flex",
            marginTop: 64,
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.45)",
          }}
        >
          model profile
        </div>

        {/* Name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 30,
            marginTop: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 30,
              height: 30,
              borderRadius: 999,
              background: m.color,
              boxShadow: `0 0 40px ${m.color}`,
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 140,
              fontWeight: 900,
              letterSpacing: -4,
              color: "white",
              lineHeight: 1,
            }}
          >
            {m.name}
          </div>
        </div>

        {/* Tag line */}
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 30,
            fontStyle: "italic",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          {`"${m.tag}"`}
        </div>

        {/* Category chips row */}
        <div
          style={{
            display: "flex",
            gap: 14,
            marginTop: 36,
          }}
        >
          {(["kiss", "marry", "kill"] as Category[]).map((cat) => (
            <div
              key={cat}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 26px",
                borderRadius: 999,
                background: `${ACCENT[cat]}1a`,
                color: ACCENT[cat],
                border: `1px solid ${ACCENT[cat]}55`,
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              {cat}
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
            color: "rgba(255,255,255,0.55)",
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          <div style={{ display: "flex" }}>
            kmk.ai/model/{m.slug}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.75)",
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

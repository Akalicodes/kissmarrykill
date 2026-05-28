import { ImageResponse } from "next/og";
import { getModel } from "@/lib/models";
import type { AwardKey } from "@/lib/types";

export const runtime = "edge";

const SIZE = { width: 1200, height: 630 };

const ACCENTS: Record<AwardKey, { color: string; bg: string }> = {
  most_kissed: { color: "#d946ef", bg: "#1a0510" },
  most_married: { color: "#ffb547", bg: "#1a1305" },
  most_killed: { color: "#ff3a3a", bg: "#1a0707" },
  most_controversial: { color: "#c87dff", bg: "#170a1a" },
  underdog: { color: "#7adfff", bg: "#06141a" },
};

/**
 * Shareable award badge generated per (month, awardKey, modelSlug).
 * GET /api/award/og?key=most_married&model=claude&month=2026-05
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = (url.searchParams.get("key") ?? "most_married") as AwardKey;
  const modelSlug = url.searchParams.get("model") ?? "";
  const month = url.searchParams.get("month") ?? "";
  const m = getModel(modelSlug);
  const accent = ACCENTS[key] ?? ACCENTS.most_married;
  const label = labelFor(key);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 64,
          background: `linear-gradient(180deg, ${accent.bg} 0%, #08080c 60%, ${accent.bg} 100%)`,
          color: "white",
          fontFamily: "system-ui, sans-serif",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -200,
            left: "50%",
            transform: "translateX(-50%)",
            width: 900,
            height: 500,
            background: `radial-gradient(circle, ${accent.color}55 0%, transparent 70%)`,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -200,
            left: "50%",
            transform: "translateX(-50%)",
            width: 700,
            height: 500,
            background: `radial-gradient(circle, ${accent.color}33 0%, transparent 70%)`,
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 22px",
            border: `1px solid ${accent.color}66`,
            borderRadius: 999,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: accent.color,
            background: `${accent.color}1a`,
          }}
        >
          {label}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            marginTop: 42,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 36,
              height: 36,
              borderRadius: 999,
              background: m?.color ?? "#888",
              boxShadow: `0 0 40px ${m?.color ?? "#888"}`,
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
            {m?.name ?? modelSlug}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 28,
            color: "rgba(255,255,255,0.7)",
            fontWeight: 600,
          }}
        >
          {m?.org ?? ""}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 60,
            alignItems: "center",
            gap: 18,
            color: "rgba(255,255,255,0.55)",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex" }}>KMK.ai</div>
          <div style={{ display: "flex", opacity: 0.4 }}>·</div>
          <div style={{ display: "flex" }}>{month}</div>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 12,
            color: "rgba(255,255,255,0.4)",
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          powered by VLS + BG8
        </div>
      </div>
    ),
    SIZE,
  );
}

function labelFor(key: AwardKey): string {
  switch (key) {
    case "most_kissed": return "Most Kissed";
    case "most_married": return "Most Married";
    case "most_killed": return "Most Killed";
    case "most_controversial": return "Most Controversial";
    case "underdog": return "Underdog of the Month";
  }
}

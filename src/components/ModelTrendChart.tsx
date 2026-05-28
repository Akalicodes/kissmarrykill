import { formatMonthLabel } from "@/lib/month";

type Point = { month: string; kiss: number; marry: number; kill: number };

const SERIES = [
  { key: "kiss" as const, color: "#d946ef", label: "Kiss" },
  { key: "marry" as const, color: "#ffb547", label: "Marry" },
  { key: "kill" as const, color: "#ff3a3a", label: "Kill" },
];

/**
 * Tiny multi-series SVG sparkline showing how this model's votes per
 * category have moved month-over-month. Rendered server-side — no
 * charting dependency.
 */
export function ModelTrendChart({ trend }: { trend: Point[] }) {
  if (trend.length < 2) return null;
  const w = 880;
  const h = 200;
  const padX = 16;
  const padY = 24;

  const maxY = Math.max(
    1,
    ...trend.flatMap((p) => [p.kiss, p.marry, p.kill]),
  );
  const stepX = (w - padX * 2) / (trend.length - 1);
  const scaleY = (v: number) =>
    h - padY - (v / maxY) * (h - padY * 2);

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="block h-auto w-full"
        preserveAspectRatio="none"
        aria-label="Monthly votes per category"
      >
        {/* Gridlines */}
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1={padX}
            x2={w - padX}
            y1={padY + g * (h - padY * 2)}
            y2={padY + g * (h - padY * 2)}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        ))}

        {SERIES.map((s) => {
          const points = trend
            .map((p, i) => `${padX + i * stepX},${scaleY(p[s.key])}`)
            .join(" ");
          return (
            <g key={s.key}>
              <polyline
                points={points}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 0 8px ${s.color}aa)` }}
              />
              {trend.map((p, i) => (
                <circle
                  key={`${s.key}-${i}`}
                  cx={padX + i * stepX}
                  cy={scaleY(p[s.key])}
                  r={i === trend.length - 1 ? 5 : 3}
                  fill={s.color}
                  stroke="#08080c"
                  strokeWidth={2}
                />
              ))}
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}` }}
              />
              <span className="text-white/65">{s.label}</span>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-4 text-white/40">
          <span>{formatMonthLabel(trend[0].month)}</span>
          <span>→</span>
          <span>{formatMonthLabel(trend[trend.length - 1].month)}</span>
        </div>
      </div>
    </div>
  );
}

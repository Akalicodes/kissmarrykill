import { getModel } from "@/lib/models";

/** A tiny colored chip with the model name. Used inside lists / reason rows. */
export function ModelDot({
  slug,
  size = "sm",
}: {
  slug: string;
  size?: "sm" | "md";
}) {
  const m = getModel(slug);
  if (!m) return <span>{slug}</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={
          size === "md"
            ? "h-3 w-3 rounded-full"
            : "h-2 w-2 rounded-full"
        }
        style={{
          backgroundColor: m.color,
          boxShadow: `0 0 12px ${m.color}80`,
        }}
        aria-hidden
      />
      <span className="font-semibold text-white">{m.name}</span>
    </span>
  );
}

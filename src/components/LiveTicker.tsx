"use client";

import { useEffect, useState } from "react";
import { MODELS } from "@/lib/models";

const VERBS = [
  { v: "kissed", color: "#d946ef" },
  { v: "married", color: "#ffb547" },
  { v: "killed", color: "#ff3a3a" },
];

type Item = {
  where: string;
  verb: string;
  color: string;
  model: string;
  modelColor: string;
};

/**
 * Decorative "live" ticker. Items are synthesised client-side from the model
 * roster, AFTER mount, so the random output never enters server-rendered HTML
 * and we avoid React hydration mismatches.
 */
export function LiveTicker() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    // Initial fill after mount.
    setItems(buildItems());
    // Periodic refresh — keeps it feeling alive.
    const id = setInterval(() => setItems(buildItems()), 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative mt-10 flex w-screen -mx-6 overflow-hidden border-y border-white/5 bg-black/40 py-2">
      {items.length === 0 ? (
        // Reserves the row's height during SSR + first client paint so
        // nothing jumps when the items populate.
        <div className="h-5 w-full" aria-hidden />
      ) : (
        <div className="flex shrink-0 animate-marquee gap-8 whitespace-nowrap pr-8 text-xs font-medium text-white/65">
          {items.concat(items).map((it, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-white/50">someone in {it.where}</span>
              <span style={{ color: it.color }} className="font-bold">
                {it.verb}
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: it.modelColor }}
                />
                <span className="font-bold text-white">{it.model}</span>
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const PLACES = [
  "Tokyo", "Berlin", "São Paulo", "Lagos", "Brooklyn", "Bangalore",
  "Lisbon", "Mexico City", "Seoul", "Toronto", "Helsinki", "Cape Town",
  "Sydney", "Istanbul", "Tel Aviv", "Bogotá",
];

function buildItems(): Item[] {
  const out: Item[] = [];
  for (let i = 0; i < 14; i++) {
    const v = VERBS[Math.floor(Math.random() * VERBS.length)];
    const m = MODELS[Math.floor(Math.random() * MODELS.length)];
    out.push({
      where: PLACES[Math.floor(Math.random() * PLACES.length)],
      verb: v.v,
      color: v.color,
      model: m.name,
      modelColor: m.color,
    });
  }
  return out;
}

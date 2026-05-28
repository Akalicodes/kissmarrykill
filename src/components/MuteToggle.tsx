"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isMuted, setMuted } from "@/lib/sound";

export function MuteToggle({ className }: { className?: string }) {
  const [muted, setLocal] = useState(false);

  useEffect(() => {
    setLocal(isMuted());
  }, []);

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    setLocal(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? "unmute sound effects" : "mute sound effects"}
      className={
        className ??
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
      }
      title={muted ? "sound is off" : "sound is on"}
    >
      {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
    </button>
  );
}

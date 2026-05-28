/**
 * Tiny synthesised UI sounds via Web Audio API. No assets needed.
 * All sounds gracefully no-op if AudioContext isn't available or the
 * user has muted via the settings menu.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Klass =
    (window.AudioContext as typeof AudioContext | undefined) ??
    ((window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext);
  if (!Klass) return null;
  try {
    ctx = new Klass();
  } catch {
    ctx = null;
  }
  return ctx;
}

const MUTE_KEY = "kmkai_muted";

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_KEY) === "1";
}

export function setMuted(v: boolean) {
  if (typeof window === "undefined") return;
  if (v) window.localStorage.setItem(MUTE_KEY, "1");
  else window.localStorage.removeItem(MUTE_KEY);
}

/** Soft confirmation chime — used on click/select. */
export function playClick() {
  beep([{ freq: 660, dur: 0.04, gain: 0.05 }]);
}

/** Two-tone arpeggio used after a successful vote. */
export function playVote() {
  beep([
    { freq: 587.33, dur: 0.08, gain: 0.06 },
    { freq: 880.00, dur: 0.1, gain: 0.06, delay: 0.05 },
    { freq: 1174.66, dur: 0.18, gain: 0.05, delay: 0.12 },
  ]);
}

/** Soft single tap, used for reactions. */
export function playReact() {
  beep([{ freq: 880, dur: 0.05, gain: 0.04 }]);
}

type Tone = { freq: number; dur: number; gain: number; delay?: number };

function beep(tones: Tone[]) {
  if (isMuted()) return;
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume().catch(() => {});

  const now = ac.currentTime;
  for (const t of tones) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = t.freq;
    const start = now + (t.delay ?? 0);
    const end = start + t.dur;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(t.gain, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}

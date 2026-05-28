/**
 * Tiny self-contained confetti burst. No dependency, no SSR concerns.
 * Renders into a full-screen canvas overlay and cleans itself up.
 */

const COLORS = ["#d946ef", "#ffb547", "#ff3a3a", "#ffffff", "#7adfff"];

export function burstConfetti(opts: { count?: number } = {}) {
  if (typeof window === "undefined") return;
  const count = opts.count ?? 110;

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";
  const dpr = window.devicePixelRatio || 1;
  const resize = () => {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  };
  resize();
  window.addEventListener("resize", resize);
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    window.removeEventListener("resize", resize);
    return;
  }

  type Particle = {
    x: number; y: number;
    vx: number; vy: number;
    rot: number; vrot: number;
    size: number;
    color: string;
    life: number;
  };

  const particles: Particle[] = [];
  const cx = canvas.width / 2;
  const cy = canvas.height * 0.4;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * Math.random());
    const speed = (6 + Math.random() * 10) * dpr;
    particles.push({
      x: cx + (Math.random() - 0.5) * 80 * dpr,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4 * dpr,
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.4,
      size: (5 + Math.random() * 7) * dpr,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 1,
    });
  }

  const gravity = 0.35 * dpr;
  const drag = 0.992;
  const start = performance.now();
  const DURATION = 2200;

  let raf = 0;
  const tick = (now: number) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const t = (now - start) / DURATION;
    for (const p of particles) {
      p.vx *= drag;
      p.vy = p.vy * drag + gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      p.life = Math.max(0, 1 - t);
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    if (t < 1) {
      raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.remove();
    }
  };
  raf = requestAnimationFrame(tick);
}

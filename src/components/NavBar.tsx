"use client";

import { useState } from "react";

const NAV_LINKS = [
  { href: "#origin", label: "origin" },
  { href: "#board", label: "the board" },
  { href: "#reasons", label: "reasons" },
  { href: "#vote", label: "vote" },
  { href: "#archive", label: "archive" },
];

export function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-30 border-b border-white/5 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 font-display font-black tracking-tight">
          <span className="flex items-center -space-x-1.5">
            <span className="h-3 w-3 rounded-full bg-kiss shadow-[0_0_10px] shadow-kiss/70" />
            <span className="h-3 w-3 rounded-full bg-marry shadow-[0_0_10px] shadow-marry/70" />
            <span className="h-3 w-3 rounded-full bg-kill shadow-[0_0_10px] shadow-kill/70" />
          </span>
          <span className="text-sm uppercase tracking-[0.18em] text-white/85">
            KMK<span className="text-white/35">.ai</span>
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-5 text-xs font-medium text-white/55 md:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-white transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <a
            href="#vote"
            className="hidden rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white/85 hover:border-white/30 hover:bg-white/10 md:block"
          >
            vote now
          </a>
          {/* Hamburger — mobile only */}
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-8 w-8 flex-col items-center justify-center gap-[5px] rounded-full border border-white/10 bg-white/5 md:hidden"
          >
            <span
              className={`block h-[1.5px] w-4 rounded-full bg-white/70 transition-all ${mobileOpen ? "translate-y-[6.5px] rotate-45" : ""}`}
            />
            <span
              className={`block h-[1.5px] w-4 rounded-full bg-white/70 transition-all ${mobileOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`block h-[1.5px] w-4 rounded-full bg-white/70 transition-all ${mobileOpen ? "-translate-y-[6.5px] -rotate-45" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-white/5 bg-black/60 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#vote"
              onClick={() => setMobileOpen(false)}
              className="mt-2 rounded-full bg-white/10 px-4 py-3 text-center text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/15"
            >
              vote now
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

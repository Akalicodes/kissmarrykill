export function Footer() {
  return (
    <footer className="border-t border-white/5 px-6 py-10 text-xs text-white/40">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div>
          <span className="font-bold tracking-tight text-white/70">
            Kiss / Marry / Kill: AI
          </span>{" "}
          — a public-opinion experiment, not a benchmark.
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <a href="#origin" className="hover:text-white">origin</a>
          <a href="#board" className="hover:text-white">the board</a>
          <a href="#reasons" className="hover:text-white">reasons</a>
          <a href="#vote" className="hover:text-white">vote</a>
          <a href="#archive" className="hover:text-white">archive</a>
        </div>
      </div>
      <div className="mx-auto mt-6 flex max-w-6xl flex-wrap items-center justify-between gap-3 text-[10px] uppercase tracking-wider text-white/25">
        <div>
          all opinions are those of anonymous internet voters. no models were
          harmed in the making of this site.
        </div>
        <div className="font-bold text-white/45">
          powered by VLS + BG8
        </div>
      </div>
    </footer>
  );
}

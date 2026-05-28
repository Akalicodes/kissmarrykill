/* eslint-disable @next/next/no-img-element */
/**
 * Tribute / origin section.
 *
 * Two real photos live in /public/origin/:
 *  - board.jpg : the original physical board ("Which A.I. Would You
 *    Rather... Kiss / Marry / Kill") with handwritten votes and the
 *    @bg8.ai / @vls.solutions doodle.
 *  - booth.jpg : someone photographing the board on its easel at the
 *    summit booth.
 */
export function Tribute() {
  return (
    <section
      id="origin"
      className="relative mt-24 border-t border-white/5 bg-black/40 px-6 py-20"
    >
      <div className="mx-auto max-w-6xl">
        {/* The board, presented as a museum piece up top. */}
        <figure className="relative overflow-hidden rounded-3xl border border-white/10 shadow-[0_60px_120px_-30px_rgba(0,0,0,0.7)]">
          <img
            src="/origin/board.jpg"
            alt="The original Kiss / Marry / Kill board at the summit, covered in handwritten LLM names in marker."
            className="block h-auto w-full"
          />
          <figcaption className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5 text-sm text-white/85">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/55">
                exhibit a
              </div>
              <div className="mt-1 font-semibold">
                the original board · Web Summit
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/65">
              <a
                href="https://instagram.com/bg8.ai"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1 hover:border-white/40 hover:text-white"
              >
                @bg8.ai
              </a>
              <a
                href="https://instagram.com/vls.solutions"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1 hover:border-white/40 hover:text-white"
              >
                @vls.solutions
              </a>
            </div>
          </figcaption>
        </figure>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <div>
            <span className="label">where this came from</span>
            <h2 className="heading-section mt-2">It started on a wall.</h2>
            <div className="mt-6 space-y-4 text-base leading-relaxed text-white/65">
              <p>
                Before this site existed, there was a board. A big, ugly,
                wonderful piece of foam at <span className="font-semibold text-white">Web Summit</span>,
                three columns sharpied across the top:{" "}
                <span className="font-bold text-kiss">KISS</span>,{" "}
                <span className="font-bold text-marry">MARRY</span>,{" "}
                <span className="font-bold text-kill">KILL</span>. Underneath:
                the names of every LLM anyone could think of.
              </p>
              <p>
                People walked up with markers. They argued, they second-guessed,
                they wrote their picks under names they'd never tell their
                manager about. By the end of the day the board looked less like
                a benchmark and more like a yearbook page.
              </p>
              <p>
                This website is that wall, but it never closes and the votes
                never stop coming in. The leaderboards above are a living
                continuation of that booth.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              <span className="chip">est. at Web Summit</span>
              <span className="chip">analog → digital</span>
              <span className="chip">archive forever</span>
            </div>
          </div>

          {/* Right column: booth photo + an attribution plaque. */}
          <div className="grid gap-4">
            <figure className="group relative overflow-hidden rounded-3xl border border-white/10">
              <img
                src="/origin/booth.jpg"
                alt="A summit attendee photographing the Kiss / Marry / Kill board on its easel at the VLS booth."
                className="block h-auto w-full"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-4 text-sm text-white/85">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/55">
                  exhibit b
                </div>
                <div className="mt-1 font-semibold">
                  the booth, mid-debate
                </div>
              </figcaption>
            </figure>

            <div className="glass relative overflow-hidden p-6">
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-kiss/25 via-marry/15 to-kill/25 blur-2xl" />
              <div className="relative">
                <div className="label">powered by</div>
                <div className="mt-2 font-display text-3xl font-black tracking-tight text-white md:text-4xl">
                  VLS{" "}
                  <span className="bg-gradient-to-r from-kiss via-marry to-kill bg-clip-text text-transparent">
                    +
                  </span>{" "}
                  BG8
                </div>
                <p className="mt-3 text-sm leading-relaxed text-white/60">
                  Built by the team behind the booth. The board was their
                  experiment first — this site is its second life.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href="https://instagram.com/vls.solutions"
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost"
                  >
                    @vls.solutions
                  </a>
                  <a
                    href="https://instagram.com/bg8.ai"
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost"
                  >
                    @bg8.ai
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

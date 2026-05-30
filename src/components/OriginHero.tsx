/* eslint-disable @next/next/no-img-element */
"use client";

export function OriginHero() {
  return (
    <section id="origin" className="relative px-3 pt-6 pb-6 sm:px-4 sm:pt-12 sm:pb-12 md:px-6 md:pt-16">
      <div className="mx-auto max-w-5xl">

        {/* Board photo */}
        <figure
          style={{
            position:     "relative",
            overflow:     "hidden",
            borderRadius: "14px",
            border:       "1px solid rgba(0,0,0,0.08)",
            boxShadow:    "0 24px 60px -18px rgba(0,0,0,0.22), 0 3px 10px -2px rgba(0,0,0,0.1)",
            transform:    "rotate(-0.4deg)",
            margin:       0,
          }}
        >
          <img
            src="/origin/board.jpg"
            alt="The original Kiss / Marry / Kill board at Web Summit, covered in handwritten LLM names in marker."
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        </figure>

        {/* Credits + caption row — stacked on mobile, inline on desktop */}
        <div
          style={{
            marginTop:     "0.6rem",
            display:       "flex",
            alignItems:    "baseline",
            justifyContent: "space-between",
            gap:           "0.75rem",
            flexWrap:      "wrap",
          }}
        >
          <p
            style={{
              fontFamily:    "var(--font-outfit), sans-serif",
              fontWeight:    800,
              fontSize:      "clamp(0.9rem, 3vw, 1.4rem)",
              color:         "#111",
              lineHeight:    1.3,
              letterSpacing: "-0.01em",
              margin:        0,
            }}
          >
            this is where it all started.
          </p>

          <div style={{ display: "flex", gap: "1rem" }}>
            {["@bg8.ai", "@vls.solutions"].map((handle) => (
              <a
                key={handle}
                href={`https://instagram.com/${handle.replace("@", "")}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontFamily:     "var(--font-outfit), sans-serif",
                  fontWeight:     500,
                  fontSize:       "0.78rem",
                  color:          "#555",
                  textDecoration: "none",
                  transition:     "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#111")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
              >
                {handle}
              </a>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}

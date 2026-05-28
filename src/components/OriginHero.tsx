/* eslint-disable @next/next/no-img-element */
"use client";

export function OriginHero() {
  return (
    <section id="origin" className="relative px-4 pt-12 pb-16 md:px-6 md:pt-16">
      <div className="mx-auto max-w-5xl">

        {/* Board photo */}
        <figure
          style={{
            position:     "relative",
            overflow:     "hidden",
            borderRadius: "18px",
            border:       "1px solid rgba(0,0,0,0.08)",
            boxShadow:    "0 40px 80px -20px rgba(0,0,0,0.22), 0 4px 12px -2px rgba(0,0,0,0.1)",
            transform:    "rotate(-0.4deg)",
          }}
        >
          <img
            src="/origin/board.jpg"
            alt="The original Kiss / Marry / Kill board at Web Summit, covered in handwritten LLM names in marker."
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        </figure>

        {/* Credits */}
        <div
          style={{
            marginTop:      "0.75rem",
            display:        "flex",
            justifyContent: "flex-end",
            gap:            "1.25rem",
            paddingRight:   "0.25rem",
          }}
        >
          {["@bg8.ai", "@vls.solutions"].map((handle) => (
            <a
              key={handle}
              href={`https://instagram.com/${handle.replace("@", "")}`}
              target="_blank"
              rel="noreferrer"
              style={{
                fontFamily:     "var(--font-outfit), sans-serif",
                fontWeight:     500,
                fontSize:       "0.8rem",
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

        {/* Caption line */}
        <p
          style={{
            fontFamily:    "var(--font-outfit), sans-serif",
            fontWeight:    800,
            fontSize:      "clamp(1rem, 3vw, 1.6rem)",
            color:         "#111",
            lineHeight:    1.3,
            letterSpacing: "-0.01em",
            marginTop:     "1rem",
          }}
        >
          this is where it all started.
        </p>

      </div>
    </section>
  );
}

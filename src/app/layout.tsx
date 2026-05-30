import type { Metadata } from "next";
import {
  Space_Grotesk,
  Syne,
  Permanent_Marker,
  Caveat,
  Kalam,
  Indie_Flower,
  Rock_Salt,
  Patrick_Hand,
  Geo,
  Gochi_Hand,
  Outfit,
  Shadows_Into_Light,
  Nanum_Pen_Script,
  Reenie_Beanie,
  Gloria_Hallelujah,
} from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
  display: "swap",
});

const permanentMarker = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-permanent-marker",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-caveat",
  display: "swap",
});

const kalam = Kalam({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-kalam",
  display: "swap",
});

const indieFlower = Indie_Flower({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-indie-flower",
  display: "swap",
});

const rockSalt = Rock_Salt({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-rock-salt",
  display: "swap",
});

const patrickHand = Patrick_Hand({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-patrick-hand",
  display: "swap",
});

const geo = Geo({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-geo",
  display: "swap",
});

const gochiHand = Gochi_Hand({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-gochi-hand",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-outfit",
  display: "swap",
});

// Genuinely-handwritten faces for the wall scrawls.
const shadowsIntoLight = Shadows_Into_Light({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-shadows",
  display: "swap",
});

const nanumPen = Nanum_Pen_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-nanum-pen",
  display: "swap",
});

const reenieBeanie = Reenie_Beanie({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-reenie",
  display: "swap",
});

const gloria = Gloria_Hallelujah({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-gloria",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kiss / Marry / Kill: AI — Live LLM Popularity Index",
  description:
    "The internet's live public-opinion experiment on AI models. Pick one to Kiss, one to Marry, one to Kill. Watch the rankings shift in real time.",
  openGraph: {
    title: "Kiss / Marry / Kill: AI",
    description:
      "Vote on every major LLM. Kiss the chaotic one. Marry the reliable one. Kill the one you can't stand.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kiss / Marry / Kill: AI",
    description: "Live public-opinion index for every major LLM.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const fontClasses = [
    spaceGrotesk.variable,
    syne.variable,
    permanentMarker.variable,
    caveat.variable,
    kalam.variable,
    indieFlower.variable,
    rockSalt.variable,
    patrickHand.variable,
    geo.variable,
    gochiHand.variable,
    outfit.variable,
    shadowsIntoLight.variable,
    nanumPen.variable,
    reenieBeanie.variable,
    gloria.variable,
  ].join(" ");

  return (
    <html lang="en" className={fontClasses}>
      <body className="relative overflow-x-hidden">
        {/* Global SVG defs — used by `.ink-wobble` and `.ink-wobble-strong` to
            wobble each letter's edges so handwritten text actually looks
            handwritten (not just a cursive font). One copy is enough; every
            element that references the filter id reuses it. */}
        <svg
          aria-hidden
          width="0"
          height="0"
          style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
        >
          <defs>
            <filter id="ink-wobble">
              <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="3" />
              <feDisplacementMap in="SourceGraphic" scale="1.4" />
            </filter>
            <filter id="ink-wobble-strong">
              <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" />
              <feDisplacementMap in="SourceGraphic" scale="2.4" />
            </filter>
          </defs>
        </svg>
        {children}
      </body>
    </html>
  );
}

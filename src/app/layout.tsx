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
  ].join(" ");

  return (
    <html lang="en" className={fontClasses}>
      <body className="relative overflow-x-hidden">{children}</body>
    </html>
  );
}

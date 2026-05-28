import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "KMK.ai leaderboard",
  robots: { index: false },
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-transparent">{children}</body>
    </html>
  );
}

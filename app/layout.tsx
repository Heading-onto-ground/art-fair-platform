import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

// ── Self-hosted fonts via next/font (no render-blocking @import) ──
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

// ── Enhanced SEO Metadata ──
export const metadata: Metadata = {
  metadataBase: new URL("https://art-fair-platform.vercel.app"),
  title: {
    default: "ROB — Role of Bridge | Global Art Platform",
    template: "%s | ROB",
  },
  description:
    "A global art platform connecting artists and galleries worldwide. Discover open calls, apply to exhibitions, and ship artwork across borders.",
  keywords: [
    "art platform",
    "open call",
    "artist portfolio",
    "gallery",
    "art exhibition",
    "global art network",
    "artist community",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "ROB — Role of Bridge",
    title: "ROB — Role of Bridge | Global Art Platform",
    description:
      "Connecting artists and galleries worldwide. Discover, apply, exhibit.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ROB — Role of Bridge",
    description:
      "Global art platform connecting artists and galleries across borders.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      translate="no"
      className={`${inter.variable} ${cormorant.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body>{children}</body>
    </html>
  );
}

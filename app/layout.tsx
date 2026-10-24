import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/lib/toast";
import { historyCopy } from "@/lib/history/locale";
import { historyLocale } from "@/lib/history/requestLocale";
import GoogleTagManager from "@/app/components/GoogleTagManager";
import { gtmContainerId, siteVerification } from "@/lib/publicGrowth/analytics";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://rob-roleofbridge.com"),
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
  ...(siteVerification(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION, process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION)
    ? { verification: siteVerification(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION, process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION) }
    : {}),
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ROB Ritual",
  },
  applicationName: "ROB Ritual",
  themeColor: "#8B7355",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = historyLocale();
  const copy = historyCopy(locale);
  return (
    <html
      lang={locale}
      className={`${inter.variable} ${cormorant.variable}`}
      suppressHydrationWarning
    >
      <head />
      <body>
        {gtmContainerId(process.env.NEXT_PUBLIC_GTM_ID) ? <GoogleTagManager id={gtmContainerId(process.env.NEXT_PUBLIC_GTM_ID) as string} /> : null}
        <a href="#main-content" className="skip-link">
          {copy.skipToContent}
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

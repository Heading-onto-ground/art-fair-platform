import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/lib/toast";
import { historyCopy } from "@/lib/history/locale";
import { historyLocale, pinnedLocale } from "@/lib/history/requestLocale";
import GoogleTagManager from "@/app/components/GoogleTagManager";
import { LocaleUrlProvider } from "@/app/components/history/LocaleUrl";
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

export async function generateMetadata(): Promise<Metadata> {
  const locale = historyLocale();
  const ko = locale === "ko";
  const title = ko ? "ROB — 작가의 전시 이력과 기록된 연결" : "ROB — Artist History & Documented Connections";
  const description = ko
    ? "작가를 검색하고 공식 출처로 확인된 전시, 공간, 큐레이터와 작가 간 연결을 따라가세요."
    : "Search artists and explore documented exhibitions, spaces, curators, and artist connections. ROB builds verified art histories from official sources.";
  const verification = siteVerification(
    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION,
  );
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://rob-roleofbridge.com"),
    title: { default: title, template: "%s | ROB" },
    description,
    openGraph: {
      type: "website",
      locale: ko ? "ko_KR" : "en_US",
      siteName: "ROB",
      title,
      description,
    },
    twitter: { card: "summary", title, description },
    robots: { index: true, follow: true },
    ...(verification ? { verification } : {}),
    appleWebApp: { capable: true, statusBarStyle: "default", title: "ROB" },
    applicationName: "ROB",
    themeColor: "#8B7355",
    viewport: { width: "device-width", initialScale: 1, maximumScale: 1, viewportFit: "cover" },
  };
}

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
        <LocaleUrlProvider locale={pinnedLocale()}>
          <ToastProvider>{children}</ToastProvider>
        </LocaleUrlProvider>
      </body>
    </html>
  );
}

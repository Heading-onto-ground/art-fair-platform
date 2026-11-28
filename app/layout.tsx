import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ToastProvider } from "@/lib/toast";
import { historyCopy } from "@/lib/history/locale";
import { historyLocale, pinnedLocale, requestPath } from "@/lib/history/requestLocale";
import { languageAlternates, openGraphLocale } from "@/lib/seo";
import GoogleTagManager from "@/app/components/GoogleTagManager";
import { LocaleUrlProvider } from "@/app/components/history/LocaleUrl";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { gtmContainerId, siteVerification } from "@/lib/publicGrowth/analytics";

// Local OFL files. Build does not download fonts from Google.
const inter = localFont({
  src: [
    { path: "./fonts/inter-latin-300-normal.woff2", weight: "300", style: "normal" },
    { path: "./fonts/inter-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/inter-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/inter-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = localFont({
  src: [
    { path: "./fonts/cormorant-garamond-latin-300-normal.woff2", weight: "300", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-300-italic.woff2", weight: "300", style: "italic" },
    { path: "./fonts/cormorant-garamond-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/cormorant-garamond-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-500-italic.woff2", weight: "500", style: "italic" },
    { path: "./fonts/cormorant-garamond-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-600-italic.woff2", weight: "600", style: "italic" },
    { path: "./fonts/cormorant-garamond-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-700-italic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-cormorant",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = historyLocale();
  const title = historyCopy(locale).pageTitle;
  const description = historyCopy(locale).pageDescription;
  const verification = siteVerification(
    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION,
  );
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://rob-roleofbridge.com"),
    title: { default: title, template: "%s | ROB" },
    description,
    alternates: languageAlternates(requestPath(), pinnedLocale()),
    openGraph: {
      type: "website",
      locale: openGraphLocale(locale),
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
        <LocaleProvider locale={locale}>
          <LocaleUrlProvider locale={pinnedLocale()}>
            <ToastProvider>{children}</ToastProvider>
          </LocaleUrlProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}

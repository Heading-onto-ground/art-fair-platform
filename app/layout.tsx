import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ROB : role of bridge",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang =
    typeof navigator !== "undefined"
      ? navigator.language.slice(0, 2)
      : "en";

  return (
    <html lang={lang}>
      <body>{children}</body>
    </html>
  );
}

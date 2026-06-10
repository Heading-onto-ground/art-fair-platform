import type { Metadata } from "next";
import { getCountryByCode } from "@/lib/countryData";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: { code: string };
}): Promise<Metadata> {
  const country = getCountryByCode(params.code);
  if (!country) {
    return pageMetadata({
      title: "Open Calls by Country | ROB",
      description:
        "Discover open calls and galleries by country on ROB — Role of Bridge, a global art platform.",
      path: `/country/${params.code}`,
    });
  }

  return pageMetadata({
    title: country.seoTitle,
    description: country.seoDescription,
    path: `/country/${params.code}`,
  });
}

export default function CountryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

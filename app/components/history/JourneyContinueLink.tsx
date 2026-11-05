"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { continueJourneyHref } from "@/lib/history/journeyTrail";
import { usePublicHref } from "@/app/components/history/LocaleUrl";

export default function JourneyContinueLink({
  slug,
  via = null,
  className,
  children,
  onClick,
}: {
  slug: string;
  via?: string | null;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const router = useRouter();
  const publicHref = usePublicHref();
  const href = publicHref(`/artists/${slug}`);
  return (
    <Link
      className={className}
      href={href}
      onClick={(event) => {
        onClick?.();
        let next: string | null = null;
        try {
          next = continueJourneyHref(sessionStorage, slug, via);
        } catch {
          next = null;
        }
        if (!next) return;
        event.preventDefault();
        router.push(publicHref(next));
      }}
    >
      {children}
    </Link>
  );
}

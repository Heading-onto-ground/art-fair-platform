"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { continueJourneyHref } from "@/lib/history/journeyTrail";

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
  const href = `/artists/${slug}`;
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
        router.push(next);
      }}
    >
      {children}
    </Link>
  );
}

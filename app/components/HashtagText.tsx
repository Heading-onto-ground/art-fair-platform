"use client";

import Link from "next/link";
import type { HashtagSegment } from "@/lib/hashtags";
import { segmentCaption } from "@/lib/hashtags";
import { F } from "@/lib/design";

type Props = {
  text: string;
  className?: string;
  style?: React.CSSProperties;
};

export default function HashtagText({ text, style }: Props) {
  const segments: HashtagSegment[] = segmentCaption(text);

  return (
    <span style={style}>
      {segments.map((seg, i) =>
        seg.type === "tag" ? (
          <Link
            key={`${seg.value}-${i}`}
            href={`/explore?tag=${encodeURIComponent(seg.value)}`}
            style={{
              fontFamily: F,
              color: "#4A6FA5",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            #{seg.value}
          </Link>
        ) : (
          <span key={`t-${i}`}>{seg.value}</span>
        ),
      )}
    </span>
  );
}

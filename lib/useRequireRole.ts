"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMe, Role } from "@/lib/authClient";

export function useRequireRole(required: Role) {
  const router = useRouter();
  const [me, setMe] = useState<Awaited<ReturnType<typeof fetchMe>>>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const m = await fetchMe({ preferCache: true });
      const role = m?.session?.role;

      // 로그인 안함
      if (!role) {
        router.replace("/login");
        return;
      }

      // role 불일치면 해당 대시보드로 튕김
      if (role !== required) {
        router.replace(role === "artist" ? "/artist" : "/gallery");
        return;
      }

      setMe(m);
      setLoading(false);
    })();
  }, [required, router]);

  return { me, loading };
}
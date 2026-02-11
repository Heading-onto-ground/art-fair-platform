import useSWR, { SWRConfiguration } from "swr";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

/** SWR-based data fetcher with caching + background revalidation */
export function useFetch<T = any>(
  url: string | null,
  options?: SWRConfiguration
) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // dedupe requests within 10s
      ...options,
    }
  );

  return { data, error, isLoading, isValidating, mutate };
}

/** Prefetch data into SWR cache (call on hover/mount) */
export function prefetch(url: string) {
  // Fire and forget — warms the SWR cache
  fetcher(url).catch(() => {});
}

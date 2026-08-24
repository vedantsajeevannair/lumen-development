import { useCallback, useEffect, useState } from "react";
import { api, type RequestOptions } from "./api";

/** Minimal data-fetching hook: loads `path` on mount, exposes reload().
 *  Pass `{ root: true }` for controllers served outside the /api prefix. */
export function useApi<T = unknown>(path: string | null, opts?: RequestOptions) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Options are an inline object at every call site, so depend on its contents
  // rather than its identity — otherwise reload() changes on every render and
  // the effect below loops.
  const root = opts?.root ?? false;
  const upload = opts?.upload ?? false;

  const reload = useCallback(() => {
    if (!path) return;
    setLoading(true);
    api.get(path, { root, upload })
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [path, root, upload]);

  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload };
}

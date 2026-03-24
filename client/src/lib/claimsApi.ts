/**
 * Databricks Apps often forward requests to the FastAPI app without an `/api` prefix,
 * so `/api/claims/...` 404s while `/claims/...` works. Try primary URL, then fallback.
 */
export async function fetchClaimsApi(path: string, init?: RequestInit): Promise<Response> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const primary = `/api/claims${normalized}`;
  let res = await fetch(primary, init);
  if (res.status === 404) {
    res = await fetch(`/claims${normalized}`, init);
  }
  return res;
}

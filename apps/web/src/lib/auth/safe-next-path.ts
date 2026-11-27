// Keeps post-auth redirects on this site, whatever the "next" parameter says.
export function safeNextPath(
  next: string | null,
  origin: string,
  fallback: string,
) {
  if (!next) return fallback;

  try {
    const url = new URL(next, origin);
    return url.origin === origin ? url.pathname + url.search : fallback;
  } catch {
    return fallback;
  }
}

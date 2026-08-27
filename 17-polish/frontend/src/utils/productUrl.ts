/**
 * Turn a pasted product link into a loadable URL. A user pastes "nike.com/x" as
 * often as a full "https://…", so a missing scheme gets https:// prepended and
 * surrounding whitespace is trimmed; the in-app browser can then open it.
 */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * A pasted link is openable when it parses as an http(s) URL with a dotted host,
 * so "nike.com" passes but "hello" and "about:blank" do not.
 */
export function isValidProductUrl(raw: string): boolean {
  const normalized = normalizeUrl(raw);
  if (!normalized) return false;
  try {
    const { protocol, hostname } = new URL(normalized);
    return (protocol === 'http:' || protocol === 'https:') && hostname.includes('.');
  } catch {
    return false;
  }
}

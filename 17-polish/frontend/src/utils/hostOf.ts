/**
 * The bare display host of a URL — no scheme, no `www.`
 * (https://www.nike.com/p/42 → nike.com). Serves a link button's label and the
 * match of the page you're on against a brand's site. A URL that won't parse
 * falls back to its raw string.
 */
export default function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

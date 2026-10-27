const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/**
 * Prefixes site-relative paths with the configured base path so links and
 * assets work both at https://owner.github.io/repo/ and on a custom domain.
 * External URLs, anchors, mailto: and tel: links pass through unchanged.
 */
export function url(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  return `${base}${path}` || '/';
}

/** Absolute URL, for canonical links, Open Graph and structured data. */
export function absoluteUrl(path: string, site: URL | undefined): string {
  if (/^https?:\/\//.test(path)) return path;
  return new URL(url(path), site ?? 'http://localhost:4321').toString();
}

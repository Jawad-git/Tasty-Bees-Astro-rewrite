import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { url } from './url';

const WIDTHS = [240, 480] as const;

/**
 * Builds a srcset when smaller copies of a public/ image exist alongside it
 * ("photo-240.webp", "photo-480.webp"). The originals are 720px wide.
 * Images without variants (e.g. new CMS uploads) simply get no srcset.
 */
export function responsiveSrcset(path: string, fullWidth = 720): string | undefined {
  if (!path.startsWith('/')) return undefined;
  const variants = WIDTHS.map((w) => ({ w, path: path.replace(/(\.\w+)$/, `-${w}$1`) })).filter((v) =>
    existsSync(join(process.cwd(), 'public', v.path)),
  );
  if (variants.length === 0) return undefined;
  return [...variants.map((v) => `${url(v.path)} ${v.w}w`), `${url(path)} ${fullWidth}w`].join(', ');
}

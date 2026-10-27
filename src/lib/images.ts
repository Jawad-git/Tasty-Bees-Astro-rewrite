import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { url } from './url';

// Must match WIDTHS in scripts/image-variants.mjs.
const WIDTHS = [240, 480, 720] as const;

/**
 * Returns src/srcset for a public/ image, using the resized WebP copies that
 * scripts/image-variants.mjs writes to public/_img/. Falls back to the
 * original file when no copies exist (e.g. an external URL).
 */
export function responsiveImage(path: string): { src: string; srcset?: string } {
  if (!path.startsWith('/')) return { src: path };
  const base = path.replace(/\.\w+$/, '');
  const variants = WIDTHS.map((w) => ({ w, path: `/_img${base}-${w}.webp` })).filter((v) =>
    existsSync(join(process.cwd(), 'public', v.path)),
  );
  const largest = variants.at(-1);
  if (!largest) return { src: url(path) };
  return { src: url(largest.path), srcset: variants.map((v) => `${url(v.path)} ${v.w}w`).join(', ') };
}

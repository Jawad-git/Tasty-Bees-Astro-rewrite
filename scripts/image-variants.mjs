// @ts-check
/**
 * Creates resized WebP copies of menu photos and CMS uploads so phones
 * download small files. Runs before every dev/build; only new or changed
 * images are processed. Output goes to public/_img/ (not committed).
 *
 *   public/images/uploads/latte.jpg -> public/_img/images/uploads/latte-{240,480,720}.webp
 */
import { readdir, stat, mkdir } from 'node:fs/promises';
import { join, relative, dirname, extname } from 'node:path';
import sharp from 'sharp';

const PUBLIC = 'public';
const SOURCES = ['images/menu', 'images/uploads'];
const OUT = join(PUBLIC, '_img');
export const WIDTHS = [240, 480, 720];
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

/** @param {string} dir @returns {Promise<string[]>} */
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(
    entries.map((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])),
  );
  return files.flat();
}

/** @param {string} file */
const mtime = (file) => stat(file).then((s) => s.mtimeMs, () => 0);

let made = 0;
for (const source of SOURCES) {
  for (const file of await walk(join(PUBLIC, source))) {
    const ext = extname(file).toLowerCase();
    if (!EXTENSIONS.has(ext)) continue;
    const rel = relative(PUBLIC, file).slice(0, -ext.length);
    const srcTime = await mtime(file);
    const image = sharp(file, { failOn: 'none' });
    const { width = 0 } = await image.metadata();
    for (const w of WIDTHS) {
      const out = join(OUT, `${rel}-${w}.webp`);
      if ((await mtime(out)) >= srcTime) continue;
      await mkdir(dirname(out), { recursive: true });
      await image
        .clone()
        .rotate()
        .resize({ width: Math.min(w, width || w), withoutEnlargement: true })
        .webp({ quality: 74 })
        .toFile(out);
      made++;
    }
  }
}
console.log(`[images] ${made} variant(s) written to ${OUT}`);

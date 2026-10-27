// @ts-check
/**
 * Markdown (Sätteri hast) plugin: prefixes root-relative links and images in
 * Markdown ("/menu/", "/images/x.webp") with the site's base path, so content
 * written in the CMS also works when the site is served from a GitHub Pages
 * project subpath such as https://owner.github.io/repo/.
 * @param {string} base
 */
export default function baseLinksPlugin(base) {
  const prefix = base.replace(/\/$/, '');
  return {
    name: 'base-links',
    element: {
      filter: ['a', 'img'],
      /** @param {any} node @param {any} ctx */
      visit(node, ctx) {
        if (!prefix) return;
        const attr = node.tagName === 'a' ? 'href' : 'src';
        const value = node.properties?.[attr];
        if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith(`${prefix}/`)) {
          ctx.setProperty(node, attr, prefix + value);
        }
      },
    },
  };
}

import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL(`${import.meta.env.BASE_URL.replace(/\/$/, '')}/sitemap-index.xml`, site);
  const body = `User-agent: *\nAllow: /\nDisallow: ${import.meta.env.BASE_URL.replace(/\/$/, '')}/admin/\n\nSitemap: ${sitemap.href}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

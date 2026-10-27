// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';
import baseLinksPlugin from './src/lib/markdown-base-links.mjs';

// Deployment target, set by the GitHub Pages workflow (see README "Deployment modes").
//   Project site:  SITE_URL=https://<owner>.github.io  BASE_PATH=/<repo>
//   Custom domain: SITE_URL=https://www.example.com    BASE_PATH=  (empty)
const site = process.env.SITE_URL || 'http://localhost:4321';
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  integrations: [sitemap()],
  markdown: {
    processor: satteri({ hastPlugins: [baseLinksPlugin(base)] }),
  },
});

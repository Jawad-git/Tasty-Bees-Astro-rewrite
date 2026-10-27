# TastyBees website

A fast, static café website built with [Astro](https://astro.build), edited through
[Decap CMS](https://decapcms.org) and deployed for free to GitHub Pages.

- **Pages** (Home, About, Contact) are Markdown files in `src/content/pages/`.
- **Structured data** (menu, hours, contact details, links) is JSON in `src/data/`.
- **The owner edits everything at `/admin/`**: no code, no raw JSON.
- **Every save in the CMS is a Git commit**, which rebuilds and redeploys the site.

No database, no server, no paid services are needed for the public site.

## Status at a glance

| Part | State |
| --- | --- |
| Site build (`npm run build`) | Verified locally: 0 errors, 0 warnings |
| Home, Menu, About, Contact pages | Verified: rendered from the Markdown and JSON files |
| Menu data | Real items, prices and photos imported from menu.tastybees.com (201 items, 19 categories) |
| Links and assets under a repo subpath | Verified with a crawl of the built site at `/Tasty-Bees-Astro-rewrite/` |
| Decap CMS editing | Verified with the local backend (`npm run cms`): menu price, availability and page edits saved to the right files and the site rebuilt from them |
| Decap CMS sign-in on the live site | **Not set up.** Needs an OAuth proxy (see [CMS authentication](#cms-authentication)) |
| GitHub Pages deployment | Workflow written and the build steps verified locally. **The live deployment has not run yet**: GitHub Pages must be switched on once (see [Deployment](#deployment)) |
| Contact form delivery | **Not connected.** The form validates input and opens the visitor's email app until a form service is added (see [Contact form](#contact-form)) |
| Business address and opening hours | **Placeholders**, clearly labelled on the site and hidden from search engines |

## Quick start

Requires Node.js 22.23.4 or newer (24 recommended; see `.nvmrc`).

```bash
npm ci            # install exact dependency versions from package-lock.json
npm run dev       # http://localhost:4321
npm run check     # TypeScript and Astro checks, content schema validation
npm run build     # check + production build into dist/
npm run preview   # serve dist/ locally
npm run cms       # local CMS backend, see "Editing locally with the CMS"
```

## Project structure

```
public/
  admin/index.html        Decap CMS app (loaded from unpkg, version pinned)
  admin/config.yml        CMS collections, mapped 1:1 to the files below
  images/menu/            Menu photos (optimised WebP)
  images/site/            Hero, about, logo, social sharing image
  images/uploads/         Where images uploaded in the CMS are stored
src/
  content.config.ts       Schema for the Markdown pages (frontmatter validation)
  content/pages/          home.md, about.md, contact.md
  data/
    site.json             Name, tagline, logo, contact details, address, SEO
    menu.json             Currency, categories and items
    hours.json            Opening hours, notes and holiday closures
    navigation.json       Header and footer links
    social-links.json     Social media links
    contact-form.json     Contact form service settings
  lib/
    data.ts               Loads and validates every JSON file (zod)
    format.ts             Prices (Intl currency), times and dates
    schema.ts             Schema.org structured data
    url.ts                Base-path aware links
    markdown-base-links.mjs  Fixes root-relative links inside Markdown
  components/             Header, Footer, Hero, MenuCategory, MenuItem,
                          ContactSection, ContactForm, OpeningHours, ...
  layouts/BaseLayout.astro  <head>: titles, descriptions, canonical, Open Graph
  pages/                  index, menu, about, contact, 404, robots.txt
  styles/global.css       Design tokens and base styles
.github/workflows/deploy.yml  Build and deploy to GitHub Pages
```

## Editing content

### With the CMS (recommended for the owner)

Open `https://<your-site>/admin/` and sign in with GitHub (once authentication is set
up). The CMS has three sections:

- **Pages**: Home, About and Contact. Titles, search descriptions, headings, intro text,
  images and the page text in a rich text editor.
- **Menu**: categories and items. Drag the handles to reorder categories or items;
  the order in the CMS is the order on the site. For each item you can change the name,
  Arabic name, description, prices (one or several sizes), photo, "Available today",
  "Feature on the homepage", dietary labels, allergens and a short note such as
  "Takeaway only". Untick "Show this category" to hide a whole category.
- **Café settings**: café details and SEO, opening hours and holiday closures,
  navigation, social links and contact form settings.

Each **Publish** creates a commit on `main`; the site updates about a minute later.

### Editing locally with the CMS (no sign-in needed)

```bash
npm run dev     # terminal 1
npm run cms     # terminal 2: decap-server writes straight to your working copy
```

Open <http://localhost:4321/admin/index.html> and click **Login**. Changes are written to
the files on disk; review them with `git diff` and commit as usual. (`local_backend` in
`config.yml` is ignored on the live site.)

### By hand

Pages are Markdown with frontmatter:

```markdown
---
title: About Us                 # browser tab and search result title (max 70 chars)
description: The story behind…  # search result text (50–170 chars)
heading: Made fresh, served generously
intro: Optional text under the heading
heroImage: /images/site/about-cake.webp
heroImageAlt: Describe the image for screen readers
---

## Our story

Markdown content…
```

Menu items in `src/data/menu.json`:

```json
{
  "id": "spanish-latte",
  "name": "Spanish Latte",
  "secondaryName": "سبانيش لاتيه",
  "description": "Double shot of espresso blended with milk…",
  "prices": [{ "label": "", "amount": 5 }],
  "image": "/images/menu/spanish-latte.webp",
  "available": true,
  "featured": true,
  "dietary": [],
  "allergens": [],
  "note": "Takeaway only"
}
```

- `prices` takes one entry per size: `[{ "label": "Medium", "amount": 4 }, { "label": "Large", "amount": 5 }]`.
- The currency is set once in `menu.json` (`"currency": { "code": "USD", "locale": "en-US" }`)
  and formatted with `Intl.NumberFormat`; components never hard-code a symbol.
- `id`s are lowercase-with-dashes and must be unique. They become anchors such as
  `/menu/#coffee` and `#item-spanish-latte`.
- Image paths start with `/` and point into `public/`. The base path is added automatically.

### Validation

Every JSON file is validated with zod when the site builds (`src/lib/data.ts`), and the
Markdown frontmatter is validated by the content collection schema. A mistake stops the
build with a message naming the file and field, for example:

```
Invalid content in src/data/menu.json:
✖ duplicate item id "espresso" (item ids must be unique across the whole menu)
  → at categories[2].items[0].id
```

If a CMS edit ever produces invalid data, the deploy fails and the live site keeps the
previous version.

## Deployment

The workflow `.github/workflows/deploy.yml` runs on every push to `main` (including CMS
commits), on pull requests (build only) and on demand:

1. checks out the repository,
2. installs dependencies with `npm ci` (cached, reproducible from `package-lock.json`),
3. works out the site URL and base path,
4. runs `npm run check` (types, Astro diagnostics, content schemas),
5. builds with `astro build` (which also validates the JSON data),
6. uploads `dist/` and deploys it with `actions/deploy-pages`.

It uses GitHub's free hosted runners; nothing runs between deployments.

### One-time setup

1. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Re-run the latest workflow (Actions tab → "Build and deploy to GitHub Pages" → Re-run),
   or push any commit.

Until step 1 is done, the build job still runs (and reports a warning) but the deploy job
fails because Pages is not enabled.

### Deployment modes

The site URL and base path come from environment variables read in `astro.config.mjs`:

| Mode | `SITE_URL` | `BASE_PATH` | Site address |
| --- | --- | --- | --- |
| Project site (default) | `https://jawad-git.github.io` | `/Tasty-Bees-Astro-rewrite` | `https://jawad-git.github.io/Tasty-Bees-Astro-rewrite/` |
| Custom domain | `https://www.example.com` | *(empty)* | `https://www.example.com/` |
| Local dev | `http://localhost:4321` | `/` | `http://localhost:4321/` |

The workflow picks these automatically from the GitHub Pages settings
(`actions/configure-pages`), so a custom domain configured under Settings → Pages needs no
code change. To override, add repository **variables** (Settings → Secrets and variables →
Actions → Variables) named `SITE_URL` and `BASE_PATH`.

For a custom domain also: add the domain under Settings → Pages, create the DNS records
GitHub shows, tick "Enforce HTTPS", and update `site_url` in `public/admin/config.yml`.

Build locally for a subpath to test:

```bash
SITE_URL=https://jawad-git.github.io BASE_PATH=/Tasty-Bees-Astro-rewrite npm run build
```

All internal links, images, the sitemap, canonical URLs and links written inside Markdown
get the base path (see `src/lib/url.ts` and `src/lib/markdown-base-links.mjs`).

Note: crawlers only read `robots.txt` at a domain root, so on a project subpath the
generated `robots.txt` is ignored; it takes effect with a custom domain. The sitemap is also
linked from every page's `<head>`.

### How a CMS edit reaches the live site

Decap commits through the GitHub API with the signed-in editor's own token. Those commits
are ordinary pushes to `main`, so they trigger the deploy workflow (only commits made with
the workflow's own `GITHUB_TOKEN` would not). Deploys take about a minute; the CMS shows
"Published" as soon as the commit is made, before the site has rebuilt.

## CMS authentication

Decap's GitHub backend signs editors in with GitHub OAuth. The OAuth code exchange needs a
client **secret**, which must never be put in the browser, and GitHub Pages cannot run
server code. So a small OAuth proxy is needed somewhere else. Until one is configured, the
public site works normally and `/admin/` simply cannot sign in.

### Recommended: Sveltia CMS Authenticator on Cloudflare Workers

[`sveltia/sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth) is free, open
source (MIT) and works with Decap CMS. It runs on Cloudflare Workers.

- Software: free. Hosting: Cloudflare Workers' free plan, which has a daily request quota
  (100,000 requests/day at the time of writing; check Cloudflare's current limits). A café
  CMS uses a handful of requests per sign-in.

Steps:

1. **Deploy the worker.** Use the "Deploy to Cloudflare" button in the
   `sveltia-cms-auth` README (free Cloudflare account). Note its URL, e.g.
   `https://sveltia-cms-auth.<your-subdomain>.workers.dev`.
2. **Create a GitHub OAuth App**: GitHub → Settings → Developer settings → OAuth Apps →
   New OAuth App.
   - Homepage URL: your site URL.
   - Authorization callback URL: `https://sveltia-cms-auth.<your-subdomain>.workers.dev/callback`
   - Generate a client secret.
3. **Add worker variables** (Cloudflare dashboard → the worker → Settings → Variables):
   - `GITHUB_CLIENT_ID`: from the OAuth app.
   - `GITHUB_CLIENT_SECRET`: from the OAuth app; mark it **Encrypt** (secret).
   - `ALLOWED_DOMAINS`: your site domain, e.g. `jawad-git.github.io` (or your custom domain).
4. **Point Decap at it** in `public/admin/config.yml`:
   ```yaml
   backend:
     name: github
     repo: Jawad-git/Tasty-Bees-Astro-rewrite
     branch: main
     base_url: https://sveltia-cms-auth.<your-subdomain>.workers.dev
   ```
5. Commit, wait for the deploy, open `/admin/` and click **Login with GitHub**.

Each editor needs a GitHub account with **write access** to the repository
(Settings → Collaborators).

### Alternatives

- **Netlify as the OAuth provider only.** Create a free Netlify site, add a GitHub OAuth
  App under Netlify's access control, then set `base_url: https://api.netlify.com` and
  `site_domain: <your-netlify-site>.netlify.app` in the backend config. Subject to Netlify's
  free plan terms. (Netlify Identity / Git Gateway is a different, deprecated route; don't
  use it.)
- **Decap Turbo**, the Decap team's hosted login service: no OAuth app to manage, but check
  its current pricing.
- **Self-host** the same proxy on any serverless platform, keeping the secret server-side.

### Moving away from GitHub later

Content lives in plain Markdown and JSON in Git, and Decap also has GitLab, Bitbucket and
Gitea/Forgejo backends. Moving means changing the `backend` block in `config.yml` and
replacing the deploy workflow with the new host's CI. No content or code changes are needed.

### Editorial workflow

Off by default, so Publish goes live in one step. Decap's editorial workflow (drafts as
pull requests) is supported with the GitHub backend; enable it with
`publish_mode: editorial_workflow` in `config.yml`. Drafts then wait as PRs until
published from the CMS.

## Contact form

`src/components/ContactForm.astro` has name, email and message fields with accessible
inline validation and a honeypot field for spam. Its settings live in
`src/data/contact-form.json` (also editable under Café settings → Contact form).

- **Now (`"enabled": false`):** the page says online messages are not switched on, and
  submitting opens the visitor's email app with the message filled in, addressed to the
  café email. Nothing claims a message was sent.
- **To turn on delivery with [Formspree](https://formspree.io)** (free plan with a monthly
  submission limit; check their current quota):
  1. Create a Formspree account and a form; set the notification email.
  2. Copy the form endpoint, e.g. `https://formspree.io/f/abcdwxyz`. It is a public URL,
     not a secret.
  3. Set `"enabled": true`, `"provider": "formspree"` and `"endpoint"` to that URL (or do it
     in the CMS).
  4. Spam: the `_gotcha` honeypot is built in; Formspree's dashboard can add reCAPTCHA or
     domain restrictions.
- **Another service** (`"provider": "custom"`): any endpoint that accepts a `POST` of form
  data and returns a 2xx status works with the same code.

## Performance, SEO and accessibility

- Fully static HTML. The only JavaScript on public pages is the mobile menu toggle and the
  contact form validation (a few KB, no framework).
- Menu photos were converted to WebP (720px, about 25 KB each). Every image has explicit
  dimensions and a CSS aspect ratio, so nothing shifts while loading; images below the fold
  load lazily, and the hero image is prioritised with a 640px variant for phones.
- One self-hosted variable font (Fraunces, headings only, Latin subset preloaded,
  `font-display: swap`); body text uses the system font stack.
- Per-page titles and descriptions, canonical URLs, Open Graph and Twitter card tags,
  `sitemap-index.xml` and `robots.txt`.
- Schema.org `CafeOrCoffeeShop` on the home and contact pages and a `Menu` with sections,
  items and prices on the menu page. Address and opening hours are only included once their
  `placeholder` flags are switched off, so search engines never receive unconfirmed details.
- Semantic landmarks and headings, skip link, visible focus styles, labelled form fields,
  `aria-current` navigation, keyboard and Escape support for the mobile menu, a no-JS
  fallback that keeps links visible. An axe-core scan of all four pages at desktop and
  phone widths reported no WCAG A/AA violations.
- CMS uploads are not resized automatically. Upload photos around 1000px wide and under
  300 KB (JPEG or WebP).

Lighthouse scores are an optimisation goal, not something this README guarantees.

## Content sources and placeholders

- **Menu items, Arabic names, descriptions, prices (USD) and photos** were imported on
  27 Oct 2026 from TastyBees' existing menu site, `menu.tastybees.com`. Photos are stored
  locally in `public/images/menu/`, so nothing is hot-linked.
- **Confirmed from that site:** the name TastyBees, email `info@tastybees.com`, the 1558
  hotline, WhatsApp +961 76 906205, and breakfast served 7:00 AM to 2:00 PM.
- **Placeholders to replace** (labelled on the site):
  - Street address and city (`site.json` → `address`; set `placeholder` to `false` when real).
  - Daily opening hours (`hours.json`; set `placeholder` to `false` when real).
  - The About page story (`about.md`).
  - Instagram, Facebook and TikTok links (disabled in `social-links.json` until URLs are added).
  - The bee logo (`public/images/site/logo.svg`) is a stand-in drawn for this site.
- **Repository and domain placeholders:** `repo` and `site_url` in
  `public/admin/config.yml` are set for `Jawad-git/Tasty-Bees-Astro-rewrite` on GitHub Pages;
  change both if the repository or domain changes.

## External services and limits

| Service | Used for | Required? | Cost / limits |
| --- | --- | --- | --- |
| GitHub (repo, Actions, Pages) | Code, content, builds, hosting | Yes | Free for public repos; Pages has soft limits (1 GB site, 100 GB/month bandwidth) and Actions minutes apply to private repos |
| unpkg CDN | Serves the Decap CMS script to `/admin/` only | For the CMS | Free; to remove the dependency, vendor `decap-cms.js` into `public/admin/` |
| Cloudflare Workers (or another OAuth proxy) | CMS sign-in | For the CMS on the live site | Free plan with a daily request quota |
| Formspree (or another form service) | Contact form delivery | Optional | Free plan with a monthly submission quota |
| Google Maps | "Open in Google Maps" link only (no embed, no script) | No | Free |

## Updating dependencies

```bash
npm outdated
npm install astro@latest @astrojs/check@latest @astrojs/sitemap@latest @astrojs/markdown-satteri@latest
npm run build
```

Decap CMS is loaded from a pinned URL in `public/admin/index.html`
(`decap-cms@3.16.3`). To update it, change the version there and test `/admin/` locally with
`npm run cms`. The local CMS server is run on demand with `npx decap-server@3.11.3`
(see the `cms` script) rather than installed, since it is only a development tool.

import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const imagePath = z
  .string()
  .refine((v) => v.startsWith('/') || /^https?:\/\//.test(v), 'must start with "/" or be a full https:// URL');

const link = z.object({ label: z.string().min(1), href: z.string().min(1) });

/** Editorial pages (home, about, contact). Each file in src/content/pages is one page. */
const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string().min(1).max(70, 'keep titles under 70 characters for search results'),
    description: z.string().min(50).max(170, 'keep descriptions between 50 and 170 characters'),
    heading: z.string().min(1),
    intro: z.string().optional(),
    heroImage: imagePath.optional(),
    heroImageAlt: z.string().optional(),
    primaryCta: link.optional(),
    secondaryCta: link.optional(),
  }).refine((p) => !p.heroImage || p.heroImageAlt, {
    message: 'heroImageAlt is required when heroImage is set',
    path: ['heroImageAlt'],
  }),
});

export const collections = { pages };

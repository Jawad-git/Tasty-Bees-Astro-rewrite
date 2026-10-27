/**
 * Loads every JSON file in src/data, validates it, and exports typed data.
 * Any invalid file stops `astro check` / `astro build` with a readable error
 * naming the file and the field that is wrong.
 */
import { z } from 'astro/zod';
import siteJson from '../data/site.json';
import menuJson from '../data/menu.json';
import hoursJson from '../data/hours.json';
import navigationJson from '../data/navigation.json';
import socialJson from '../data/social-links.json';
import contactFormJson from '../data/contact-form.json';

const nonEmpty = z.string().trim().min(1, 'is required');
const id = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be lowercase letters, numbers and dashes, e.g. "iced-latte"');
/** Site-relative path ("/images/x.webp") or absolute http(s) URL. */
const path = z.string().refine((v) => v.startsWith('/') || /^https?:\/\//.test(v), {
  message: 'must start with "/" (a file in public/) or be a full https:// URL',
});
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'must be a 24-hour time like "07:30"');

export const siteSchema = z.object({
  name: nonEmpty,
  tagline: nonEmpty,
  logo: path,
  logoAlt: nonEmpty,
  contact: z.object({
    phone: z.string(),
    phoneLabel: z.string().default('Phone'),
    whatsapp: z.string(),
    email: z.union([z.email(), z.literal('')]),
  }),
  address: z.object({
    placeholder: z.boolean().default(false),
    street: z.string(),
    city: z.string(),
    region: z.string().default(''),
    postalCode: z.string().default(''),
    country: z.string(),
    countryCode: z.string().length(2, 'must be a 2-letter country code, e.g. "LB"'),
    mapUrl: z.union([z.url(), z.literal('')]),
  }),
  seo: z.object({
    titleTemplate: z.string().includes('%s', { message: 'must contain %s where the page title goes' }),
    defaultDescription: nonEmpty,
    ogImage: path,
    ogImageAlt: nonEmpty,
    locale: nonEmpty,
  }),
  business: z.object({
    schemaType: z.enum(['CafeOrCoffeeShop', 'Bakery', 'Restaurant', 'IceCreamShop']),
    servesCuisine: z.array(z.string()),
    priceRange: z.string(),
  }),
});

const price = z.object({
  label: z.string().default(''),
  amount: z.number().nonnegative('must be zero or more'),
});

const menuItem = z.object({
  id,
  name: nonEmpty,
  secondaryName: z.string().optional(),
  description: z.string().default(''),
  prices: z.array(price).min(1, 'needs at least one price'),
  image: path.optional().or(z.literal('').transform(() => undefined)),
  available: z.boolean().default(true),
  featured: z.boolean().default(false),
  dietary: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
  note: z.string().optional(),
});

export const menuSchema = z
  .object({
    currency: z.object({
      code: z.string().regex(/^[A-Z]{3}$/, 'must be a 3-letter ISO currency code, e.g. "USD"'),
      locale: nonEmpty,
    }),
    categories: z
      .array(
        z.object({
          id,
          name: nonEmpty,
          description: z.string().default(''),
          image: path.optional().or(z.literal('').transform(() => undefined)),
          available: z.boolean().default(true),
          items: z.array(menuItem),
        }),
      )
      .min(1, 'needs at least one category'),
  })
  .superRefine((menu, ctx) => {
    const categoryIds = new Set<string>();
    const itemIds = new Set<string>();
    menu.categories.forEach((cat, ci) => {
      if (categoryIds.has(cat.id)) {
        ctx.addIssue({ code: 'custom', path: ['categories', ci, 'id'], message: `duplicate category id "${cat.id}"` });
      }
      categoryIds.add(cat.id);
      cat.items.forEach((item, ii) => {
        if (itemIds.has(item.id)) {
          ctx.addIssue({
            code: 'custom',
            path: ['categories', ci, 'items', ii, 'id'],
            message: `duplicate item id "${item.id}" (item ids must be unique across the whole menu)`,
          });
        }
        itemIds.add(item.id);
      });
    });
  });

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export const hoursSchema = z
  .object({
    placeholder: z.boolean().default(false),
    note: z.string().default(''),
    days: z.array(
      z
        .object({
          day: z.enum(DAYS),
          closed: z.boolean().default(false),
          opens: time.optional().or(z.literal('').transform(() => undefined)),
          closes: time.optional().or(z.literal('').transform(() => undefined)),
        })
        .refine((d) => d.closed || (d.opens && d.closes), {
          message: 'needs opening and closing times unless the day is marked closed',
        }),
    ),
    closures: z
      .array(z.object({ date: z.iso.date('must be a date like "2026-12-25"'), label: nonEmpty }))
      .default([]),
  })
  .refine((h) => new Set(h.days.map((d) => d.day)).size === h.days.length, {
    message: 'each day of the week may only appear once',
    path: ['days'],
  });

export const navigationSchema = z.object({
  items: z.array(z.object({ label: nonEmpty, href: path })).min(1),
});

export const SOCIAL_PLATFORMS = ['instagram', 'facebook', 'tiktok', 'whatsapp', 'x', 'youtube', 'google'] as const;

export const socialSchema = z.object({
  links: z
    .array(
      z.object({
        platform: z.enum(SOCIAL_PLATFORMS),
        label: nonEmpty,
        url: z.union([z.url(), z.literal('')]),
        enabled: z.boolean().default(true),
      }),
    )
    .refine((links) => links.every((l) => !l.enabled || l.url), {
      message: 'an enabled social link needs a URL',
    }),
});

export const contactFormSchema = z
  .object({
    enabled: z.boolean(),
    provider: z.enum(['formspree', 'custom']),
    endpoint: z.union([z.url(), z.literal('')]),
    successMessage: nonEmpty,
    disabledMessage: nonEmpty,
  })
  .refine((f) => !f.enabled || f.endpoint, { message: 'needs an endpoint URL when enabled', path: ['endpoint'] });

function load<T extends z.ZodType>(file: string, schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid content in src/data/${file}:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const site = load('site.json', siteSchema, siteJson);
export const menu = load('menu.json', menuSchema, menuJson);
export const hours = load('hours.json', hoursSchema, hoursJson);
export const navigation = load('navigation.json', navigationSchema, navigationJson);
export const socialLinks = load('social-links.json', socialSchema, socialJson).links.filter((l) => l.enabled);
export const contactForm = load('contact-form.json', contactFormSchema, contactFormJson);

export type Site = typeof site;
export type Menu = typeof menu;
export type MenuCategory = Menu['categories'][number];
export type MenuItem = MenuCategory['items'][number];
export type Hours = typeof hours;

/** Categories and items the public site should show. */
export const visibleCategories = menu.categories.filter((c) => c.available && c.items.length > 0);
export const featuredItems = visibleCategories.flatMap((c) => c.items.filter((i) => i.featured && i.available));

import { hours, menu, site, socialLinks, visibleCategories } from './data';
import { absoluteUrl } from './url';

const dayUrl = (day: string) => `https://schema.org/${day}`;

/**
 * Schema.org description of the business. Placeholder address and hours are
 * left out so search engines are never given unconfirmed details.
 */
export function businessSchema(siteUrl: URL | undefined): Record<string, unknown> {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': site.business.schemaType,
    '@id': absoluteUrl('/#business', siteUrl),
    name: site.name,
    description: site.seo.defaultDescription,
    url: absoluteUrl('/', siteUrl),
    logo: absoluteUrl(site.logo, siteUrl),
    image: absoluteUrl(site.seo.ogImage, siteUrl),
    servesCuisine: site.business.servesCuisine,
    priceRange: site.business.priceRange,
    hasMenu: absoluteUrl('/menu/', siteUrl),
  };
  if (site.contact.phone) data['telephone'] = site.contact.phone;
  if (site.contact.email) data['email'] = site.contact.email;
  const sameAs = socialLinks.map((l) => l.url);
  if (sameAs.length) data['sameAs'] = sameAs;

  if (!site.address.placeholder) {
    data['address'] = {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      addressLocality: site.address.city,
      addressRegion: site.address.region || undefined,
      postalCode: site.address.postalCode || undefined,
      addressCountry: site.address.countryCode,
    };
  }
  if (!hours.placeholder) {
    data['openingHoursSpecification'] = hours.days
      .filter((d) => !d.closed && d.opens && d.closes)
      .map((d) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: dayUrl(d.day), opens: d.opens, closes: d.closes }));
  }
  return data;
}

export function menuSchema(siteUrl: URL | undefined): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    name: `${site.name} menu`,
    url: absoluteUrl('/menu/', siteUrl),
    inLanguage: 'en',
    hasMenuSection: visibleCategories.map((cat) => ({
      '@type': 'MenuSection',
      name: cat.name,
      description: cat.description || undefined,
      hasMenuItem: cat.items
        .filter((item) => item.available)
        .map((item) => ({
          '@type': 'MenuItem',
          name: item.name,
          description: item.description || undefined,
          image: item.image ? absoluteUrl(item.image, siteUrl) : undefined,
          offers: item.prices.map((p) => ({
            '@type': 'Offer',
            name: p.label || undefined,
            price: p.amount.toFixed(2),
            priceCurrency: menu.currency.code,
          })),
        })),
    })),
  };
}

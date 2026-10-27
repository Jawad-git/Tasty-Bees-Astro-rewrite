import { menu, type Hours } from './data';

const currency = new Intl.NumberFormat(menu.currency.locale, {
  style: 'currency',
  currency: menu.currency.code,
});

export const formatPrice = (amount: number): string => currency.format(amount);

/** "07:30" -> "7:30 AM" */
export function formatTime(value: string): string {
  const [h = 0, m = 0] = value.split(':').map(Number);
  const date = new Date(Date.UTC(2000, 0, 1, h, m));
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(date);
}

export function formatDay(day: Hours['days'][number]): string {
  if (day.closed || !day.opens || !day.closes) return 'Closed';
  return `${formatTime(day.opens)} – ${formatTime(day.closes)}`;
}

/** Upcoming closures only, so past dates drop off without editing. */
export function upcomingClosures(hours: Hours, now = new Date()): Hours['closures'] {
  const today = now.toISOString().slice(0, 10);
  return hours.closures.filter((c) => c.date >= today).sort((a, b) => a.date.localeCompare(b.date));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
}

export function formatCurrency(amountCents: number, locale: string = 'en'): string {
  const amount = amountCents / 100;
  return new Intl.NumberFormat(locale === 'de' ? 'de-CH' : 'en-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyCompact(amountCents: number, locale: string = 'en'): string {
  const amount = amountCents / 100;
  return new Intl.NumberFormat(locale === 'de' ? 'de-CH' : 'en-CH', {
    style: 'currency',
    currency: 'CHF',
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(amount);
}

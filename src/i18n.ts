import { getRequestConfig } from 'next-intl/server';

// Can be imported from a shared config
const locales = ['en', 'de'];

export default getRequestConfig(async ({ locale }) => {
  // Default to 'en' if locale is not supported
  const validLocale = locales.includes(locale as 'en' | 'de') ? locale as 'en' | 'de' : 'en';

  return {
    locale: validLocale,
    messages: (await import(`../messages/${validLocale}.json`)).default
  };
});

import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  const requested = await requestLocale;

  return {
    locale: requested ?? 'en',
    messages: (await import('../../messages/en.json')).default,
  };
});

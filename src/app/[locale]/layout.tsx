import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import Navigation from "@/components/Navigation";

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages({ locale });
  
  return (
    <NextIntlClientProvider messages={messages}>
      <Navigation />
      {children}
    </NextIntlClientProvider>
  );
}

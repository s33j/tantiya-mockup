import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { locale } from "next/root-params";
import { plexSans } from "@tantiya/ui/fonts";
import { QueryProvider } from "@tantiya/ui/query-provider";
import { AppShell } from "@/components/app-shell/app-shell";
import { routing } from "@/i18n/routing";
import { ServiceWorkerRegistration } from "../service-worker-registration";
import "../globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");

  return {
    title: "Tantiya",
    description: t("description"),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
}: LayoutProps<"/[locale]">) {
  const messages = await getMessages();

  return (
    <html
      lang={await locale()}
      className={`${plexSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Client Components get only the namespaces they use. */}
        <NextIntlClientProvider
          messages={{ LanguageSwitcher: messages.LanguageSwitcher }}
        >
          <QueryProvider>
            <AppShell>{children}</AppShell>
          </QueryProvider>
        </NextIntlClientProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

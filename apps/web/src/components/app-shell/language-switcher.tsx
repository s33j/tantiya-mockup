"use client";

import { useLocale, useTranslations } from "next-intl";
import { Suspense } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// Each language is shown in its own name.
const languageNames = {
  en: { short: "EN", full: "English" },
  fil: { short: "FIL", full: "Filipino" },
} as const;

// The pathname is request data, so it sits inside Suspense (see NavLink). Until
// it is known, the links point to the home page in each language.
export function LanguageSwitcher() {
  return (
    <Suspense fallback={<LanguageLinks pathname="/" />}>
      <CurrentPageLanguageLinks />
    </Suspense>
  );
}

function CurrentPageLanguageLinks() {
  return <LanguageLinks pathname={usePathname()} />;
}

function LanguageLinks({ pathname }: { pathname: string }) {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale();

  return (
    <nav
      aria-label={t("label")}
      className="flex rounded-full border border-border bg-surface p-0.5 text-sm"
    >
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={pathname}
          locale={l}
          lang={l}
          hrefLang={l}
          aria-label={languageNames[l].full}
          aria-current={l === locale ? "true" : undefined}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 font-semibold text-text-muted hover:text-text aria-[current]:bg-accent/15 aria-[current]:text-text"
        >
          {languageNames[l].short}
        </Link>
      ))}
    </nav>
  );
}

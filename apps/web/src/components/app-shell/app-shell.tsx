import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";
import { NavLink } from "./nav-link";
import { navItems } from "./nav-items";

// Phone: header, content, safer-play line, bottom tab bar.
// Desktop (md and up): header with the main nav, content, safer-play line.
export async function AppShell({ children }: { children: ReactNode }) {
  const t = await getTranslations();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <a
        href="#main"
        className="sr-only rounded-input bg-accent px-4 py-3 font-semibold text-bg focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
      >
        {t("Shell.skipToContent")}
      </a>
      <header className="border-b border-border bg-surface-sunken">
        <div className="mx-auto flex w-full max-w-[1360px] items-center gap-6 px-4 py-3 md:px-6">
          <Link href="/" className="text-xl font-bold tracking-tight text-text">
            Tantiya
          </Link>
          <nav aria-label={t("Nav.label")} className="hidden md:block">
            <ul className="flex gap-5 text-sm">
              {navItems.map((item) => (
                <li key={item.key}>
                  <NavLink
                    href={item.href}
                    className="text-text-muted hover:text-text data-active:font-semibold data-active:text-text"
                  >
                    {t(`Nav.${item.key}`)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className="mx-auto outline-none flex w-full max-w-[1360px] flex-1 flex-col px-4 py-6 md:px-6"
      >
        {children}
      </main>

      <footer className="px-4 pt-2 pb-24 text-center text-xs text-text-muted md:pb-6">
        {t("Footer.saferPlay")}
        <span className="block">{t("Footer.helpline")}</span>
      </footer>

      <nav
        aria-label={t("Nav.label")}
        className="fixed inset-x-0 bottom-0 border-t border-border bg-surface-sunken pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-5 px-1 pt-2 pb-2">
          {navItems.map((item) => (
            <li key={item.key}>
              <NavLink
                href={item.href}
                className="flex min-h-11 flex-col items-center gap-1 py-1.5 text-[11px] text-text-muted data-active:font-semibold data-active:text-accent-text"
              >
                {item.icon}
                {t(`Nav.${item.key}`)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

import { useLocale } from "next-intl";
import { getPathname } from "@/i18n/navigation";

// For navigating after the user signs in or out. A full page load drops the
// router's cache, which holds prefetches made in the previous auth state: the
// proxy's redirects to sign-in for a guest, or a signed-in user's pages.
export function useAuthRedirect() {
  const locale = useLocale();

  return (href: string) => {
    window.location.replace(getPathname({ href, locale }));
  };
}

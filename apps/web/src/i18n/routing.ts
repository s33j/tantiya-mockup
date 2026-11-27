import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "fil"],
  defaultLocale: "en",
  // Remember a language the user picked (one that differs from their
  // browser's) across visits, not just for the browser session.
  localeCookie: {
    maxAge: 60 * 60 * 24 * 365,
  },
});

// Number and date formats for the betting screens. Coin amounts use tabular
// numerals (set on <body>); all times are shown in PHT (mockup: "All times PHT").

const tag = (locale: string) => (locale === "fil" ? "fil-PH" : "en-PH");

export function formatCoins(coins: number, locale: string) {
  return new Intl.NumberFormat(tag(locale), {
    maximumFractionDigits: 0,
  }).format(Math.round(coins));
}

export function formatPercent(price: number) {
  return `${Math.round(price * 100)}%`;
}

export function formatDecimal(odds: number, locale: string) {
  return new Intl.NumberFormat(tag(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(odds);
}

export function formatAmerican(odds: number) {
  const n = Math.round(odds);
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
}

export function formatPht(iso: string, locale: string) {
  return new Intl.DateTimeFormat(tag(locale), {
    timeZone: "Asia/Manila",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

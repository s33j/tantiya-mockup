import { useTranslations } from "next-intl";
import type { MarketOutcome, MarketType } from "@/lib/markets/data";
import { formatAmerican } from "@/lib/markets/format";
import { sideOf } from "@/lib/markets/odds";

// Shared pieces of the betting screens (Core Screen Mockups, page 2: 01–04,
// 09, 10). No browser-only hooks, so they render on the server or the client.

// Proposal, Branding: blue = Yes / first outcome, orange = No / second, always
// with a text label (Over/Under follow the same order). Band outcomes, no
// longer built, keep a neutral look.
export function outcomeTone(type: MarketType, position: number) {
  if (type === "band") {
    return {
      bar: "bg-text-muted",
      text: "text-text",
      border: "border-border-strong",
      tint: "bg-surface-sunken",
    };
  }
  return position === 0
    ? {
        bar: "bg-yes",
        text: "text-yes-text",
        border: "border-yes",
        tint: "bg-yes/10",
      }
    : {
        bar: "bg-no",
        text: "text-no-text",
        border: "border-no",
        tint: "bg-no/10",
      };
}

// Status is always shown with an icon (proposal, Branding).
export function OpenPill() {
  const t = useTranslations("Market");
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-open/15 px-2.5 py-0.5 text-xs font-semibold text-open-text">
      <svg aria-hidden="true" width="8" height="8" viewBox="0 0 8 8">
        <circle cx="4" cy="4" r="3" fill="currentColor" />
      </svg>
      {t("open")}
    </span>
  );
}

// Favourite and underdog labels for two-outcome markets (proposal, Odds
// display: Llamado and Dehado): the lower line is the favourite.
export function sideLabel(outcomes: MarketOutcome[], position: number) {
  if (outcomes.length !== 2) return null;
  const self = outcomes.find((o) => o.position === position);
  const other = outcomes.find((o) => o.position !== position);
  if (!self || !other) return null;
  return sideOf(self.odds, other.odds);
}

// A line as shown everywhere: "−150".
export function Line({
  odds,
  className,
}: {
  odds: number;
  className?: string;
}) {
  return (
    <span className={`tabular-nums ${className ?? ""}`}>
      {formatAmerican(odds)}
    </span>
  );
}

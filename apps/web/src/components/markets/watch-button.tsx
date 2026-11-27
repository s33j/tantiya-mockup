"use client";

import { toggleWatch, useWatchlist } from "@/lib/markets/watchlist";

// Star toggle for the watchlist demo (canvas 02 header, canvas 10 Watch
// column). Labels come from the server so no extra messages are sent down.
export function WatchButton({
  userId,
  slug,
  addLabel,
  removeLabel,
  size = "md",
}: {
  userId: string;
  slug: string;
  addLabel: string;
  removeLabel: string;
  size?: "sm" | "md";
}) {
  const on = useWatchlist(userId).includes(slug);
  const box =
    size === "sm" ? "size-9 rounded-input border border-border" : "size-11";

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? removeLabel : addLabel}
      title={on ? removeLabel : addLabel}
      onClick={() => toggleWatch(userId, slug)}
      className={`flex shrink-0 items-center justify-center ${box} ${on ? "text-accent-text" : "text-text-secondary"}`}
    >
      <svg
        aria-hidden="true"
        width={size === "sm" ? 18 : 22}
        height={size === "sm" ? 18 : 22}
        viewBox="0 0 24 24"
        fill={on ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      >
        <path d="M12 17l-5 3 1.5-5.5L4 10.5l5.7-.4L12 5l2.3 5.1 5.7.4-4.5 4 1.5 5.5z" />
      </svg>
    </button>
  );
}

// Watchlist page: shows only the watched markets, in the order they were
// watched (newest first).
export function WatchedMarkets({
  userId,
  cards,
  empty,
}: {
  userId: string;
  cards: { slug: string; card: React.ReactNode }[];
  empty: React.ReactNode;
}) {
  const watched = useWatchlist(userId);
  const shown = watched
    .map((slug) => cards.find((c) => c.slug === slug))
    .filter((c) => c !== undefined);

  if (shown.length === 0) return empty;
  return (
    <ul className="flex flex-col gap-3">
      {shown.map((c) => (
        <li key={c.slug}>{c.card}</li>
      ))}
    </ul>
  );
}

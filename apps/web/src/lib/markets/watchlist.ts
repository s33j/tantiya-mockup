"use client";

import { createLocalList } from "./local-store";

// Watchlist demo (approved by Dev 2, 16 Nov 2026). Not in the proposal's
// feature list; the tab came from the Core Screen Mockups. Market slugs are
// kept in this browser only, per user.

const store = createLocalList<string>("watchlist.v1");

export const useWatchlist = store.useList;

export function toggleWatch(userId: string, slug: string): boolean {
  return store.write(userId, (slugs) =>
    slugs.includes(slug) ? slugs.filter((s) => s !== slug) : [slug, ...slugs],
  );
}

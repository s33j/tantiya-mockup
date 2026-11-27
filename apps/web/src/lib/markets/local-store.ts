"use client";

import { useSyncExternalStore } from "react";

// A per-user list kept in this browser's local storage, for the betting demo
// (demo bets, watchlist). Nothing here reaches the database.

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function createLocalList<T>(name: string) {
  const empty: T[] = [];
  const cache = new Map<string, { raw: string | null; items: T[] }>();
  const key = (userId: string) => `tantiya.${name}.${userId}`;

  function read(userId: string): T[] {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key(userId));
    } catch {
      // Storage can be blocked (private mode, settings): treat as empty.
    }
    const hit = cache.get(userId);
    if (hit && hit.raw === raw) return hit.items;

    let items = empty;
    try {
      items = raw ? (JSON.parse(raw) as T[]) : empty;
    } catch {
      items = empty;
    }
    cache.set(userId, { raw, items });
    return items;
  }

  function useList(userId: string | null): T[] {
    return useSyncExternalStore(
      subscribe,
      () => (userId ? read(userId) : empty),
      () => empty,
    );
  }

  // Returns false when the browser refuses to store it.
  function write(userId: string, update: (items: T[]) => T[]): boolean {
    try {
      window.localStorage.setItem(
        key(userId),
        JSON.stringify(update(read(userId))),
      );
    } catch {
      return false;
    }
    listeners.forEach((listener) => listener());
    return true;
  }

  return { useList, write };
}

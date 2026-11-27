"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

// Copy the post's link (mockup 3.06, copy-link only; the share card image and a
// public preview page are not in this round). Links open for signed-in members.
export function ShareButton({ path }: { path: string }) {
  const t = useTranslations("Community");
  const locale = useLocale();
  const [copied, setCopied] = useState<"yes" | "no" | null>(null);

  async function copy() {
    const url = `${window.location.origin}/${locale}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied("yes");
    } catch {
      setCopied("no");
    }
    setTimeout(() => setCopied(null), 2500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex min-h-10 items-center gap-1.5 rounded-input px-2 text-text-secondary"
    >
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6" />
      </svg>
      <span role="status">
        {copied === "yes"
          ? t("linkCopied")
          : copied === "no"
            ? t("copyFailed")
            : t("share")}
      </span>
    </button>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Props = { href: string; icon: ReactNode; children: ReactNode };

// Highlights the current section. Reads the URL, so it sits in a Suspense
// boundary with NavLinkStatic as the fallback.
export function NavLink(props: Props) {
  const pathname = usePathname();
  const current =
    pathname === props.href || pathname.startsWith(`${props.href}/`);
  return <NavLinkStatic {...props} current={current} />;
}

export function NavLinkStatic({
  href,
  icon,
  children,
  current = false,
}: Props & { current?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-input px-3 text-sm ${
        current ? "bg-surface font-semibold text-text" : "text-text-secondary"
      }`}
    >
      <span
        className={`flex ${current ? "text-accent-text" : "text-text-muted"}`}
      >
        {icon}
      </span>
      {children}
    </Link>
  );
}

"use client";

import { Suspense, type ComponentProps } from "react";
import { Link, usePathname } from "@/i18n/navigation";

type Props = ComponentProps<typeof Link> & { href: string };

// Link that marks itself as the current page. "/" matches only itself;
// other links also match their sub-pages.
//
// The pathname is request data, so with Cache Components it must sit inside
// Suspense or any route with a dynamic segment fails to prerender. The static
// shell shows the plain link; the active marker appears once the path is known.
export function NavLink(props: Props) {
  return (
    <Suspense fallback={<Link {...props} />}>
      <ActiveNavLink {...props} />
    </Suspense>
  );
}

function ActiveNavLink({ href, ...props }: Props) {
  const pathname = usePathname();
  const isActive =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      data-active={isActive || undefined}
      {...props}
    />
  );
}

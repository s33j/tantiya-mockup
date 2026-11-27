import type { ReactNode } from "react";
import type messages from "../../../messages/en.json";

// Main navigation, as in the Core Screen Mockups (01 Markets feed, 10 Desktop).
// Icons are the mockups' 24px stroke icons.

export type NavItem = {
  key: Exclude<keyof typeof messages.Nav, "label">;
  href: string;
  icon: ReactNode;
};

export const iconProps = {
  "aria-hidden": true,
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const navItems: NavItem[] = [
  {
    key: "markets",
    href: "/",
    icon: (
      <svg {...iconProps}>
        <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
      </svg>
    ),
  },
  {
    key: "watchlist",
    href: "/watchlist",
    icon: (
      <svg {...iconProps}>
        <path d="M12 17l-5 3 1.5-5.5L4 10.5l5.7-.4L12 5l2.3 5.1 5.7.4-4.5 4 1.5 5.5z" />
      </svg>
    ),
  },
  {
    key: "community",
    href: "/community",
    icon: (
      <svg {...iconProps}>
        <path d="M4 5h16v10H9l-5 4zM8 9h8M8 12h5" />
      </svg>
    ),
  },
  {
    key: "bets",
    href: "/bets",
    icon: (
      <svg {...iconProps}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </svg>
    ),
  },
  {
    key: "wallet",
    href: "/wallet",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M16 12.5h2M3 10h18" />
      </svg>
    ),
  },
  {
    key: "account",
    href: "/account",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </svg>
    ),
  },
];

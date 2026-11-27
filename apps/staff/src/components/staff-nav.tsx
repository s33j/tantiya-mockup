import { Suspense } from "react";
import { getStaff } from "@/lib/staff";
import { paths } from "@/lib/paths";
import { FlagIcon, ListIcon, LogIcon, UsersIcon } from "./icons";
import { NavLink, NavLinkStatic } from "./nav-link";
import { WaitingCount } from "./waiting-count";

// Side menu items by role: Users for KYC reviewers and admins (S7), the
// Community moderation queue for moderators and admins, the full audit log for
// admins only (S8).
export async function StaffNav() {
  const staff = await getStaff();
  const roles = staff?.roles ?? [];
  const reviewer = roles.includes("kyc_reviewer") || roles.includes("admin");
  const admin = roles.includes("admin");
  const moderator = roles.includes("moderator") || admin;

  const items = [
    reviewer && {
      href: paths.home,
      icon: <ListIcon />,
      label: "KYC review",
      extra: (
        <Suspense fallback={null}>
          <WaitingCount />
        </Suspense>
      ),
    },
    reviewer && { href: "/users", icon: <UsersIcon />, label: "Users" },
    moderator && {
      href: "/moderation",
      icon: <FlagIcon />,
      label: "Moderation",
    },
    admin && { href: "/audit-log", icon: <LogIcon />, label: "Audit log" },
  ].filter((item) => !!item);

  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.href}>
          <Suspense
            fallback={
              <NavLinkStatic href={item.href} icon={item.icon}>
                {item.label}
              </NavLinkStatic>
            }
          >
            <NavLink href={item.href} icon={item.icon}>
              {item.label}
              {"extra" in item && item.extra}
            </NavLink>
          </Suspense>
        </li>
      ))}
    </ul>
  );
}

import { Suspense } from "react";
import { ShieldCheckIcon } from "@/components/icons";
import { SignOutButton } from "@/components/sign-out-button";
import { StaffNav } from "@/components/staff-nav";
import { Wordmark } from "@/components/wordmark";
import { roleLabel, getStaff } from "@/lib/staff";

// The staff shell from S4–S8: header with the signed-in staff member, side
// menu, page content.
export default function ConsoleLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-border bg-surface-sunken">
        <div className="flex min-h-16 items-center gap-6 px-6 py-3">
          <Wordmark />
          <div className="ml-auto flex flex-wrap items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5 text-open-text">
              <ShieldCheckIcon size={18} />
              Two-step sign-in on
            </span>
            <Suspense fallback={null}>
              <StaffIdentity />
            </Suspense>
            <SignOutButton variant="button" label="Sign out" />
          </div>
        </div>
      </header>
      <div className="grid flex-1 grid-cols-[232px_minmax(0,1fr)]">
        <nav
          aria-label="Staff"
          className="border-r border-border bg-surface-sunken px-3 py-4"
        >
          <Suspense fallback={null}>
            <StaffNav />
          </Suspense>
          <p className="mx-3 mt-6 mb-1 text-xs font-semibold text-text-muted">
            Later (Tasks 17, 20)
          </p>
          <ul>
            <MutedItem>Market builder</MutedItem>
            <MutedItem>Resolution queue</MutedItem>
            <MutedItem>Withdrawal approvals</MutedItem>
          </ul>
        </nav>
        <main className="min-w-0 p-8">{children}</main>
      </div>
    </>
  );
}

async function StaffIdentity() {
  const staff = await getStaff();
  if (!staff) return null;
  return (
    <span className="text-text-secondary">
      <span className="font-semibold text-text">{staff.email}</span> ·{" "}
      {staff.roles.map(roleLabel).join(", ")}
    </span>
  );
}

function MutedItem({ children }: { children: React.ReactNode }) {
  return <li className="px-3 py-1 text-sm text-text-muted">{children}</li>;
}

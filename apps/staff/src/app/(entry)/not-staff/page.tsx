import type { Metadata } from "next";
import { AlertIcon } from "@/components/icons";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata: Metadata = {
  title: "Not a staff account · Tantiya Staff",
};

// Not on the mockup canvas (my choice, needs confirmation): a signed-in account
// with no staff role.
export default function NotStaffPage() {
  return (
    <section className="flex w-full max-w-110 flex-col gap-5 rounded-card border border-border bg-surface p-8">
      <div className="flex items-center gap-3">
        <span className="flex text-closing-text">
          <AlertIcon size={28} />
        </span>
        <h1 className="text-xl leading-tight font-semibold">
          Not a staff account
        </h1>
      </div>
      <p className="text-text-secondary">
        This account has no staff role. Sign in with your staff account, or ask
        an admin to add a role to this one.
      </p>
      <div className="self-center">
        <SignOutButton variant="link" label="Use a different account" />
      </div>
    </section>
  );
}

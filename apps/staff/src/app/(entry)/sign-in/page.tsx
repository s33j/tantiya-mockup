import type { Metadata } from "next";
import { SignInForm } from "@/components/sign-in-form";

export const metadata: Metadata = { title: "Sign in · Tantiya Staff" };

// S1
export default function SignInPage() {
  return (
    <section className="flex w-full max-w-110 flex-col gap-5 rounded-card border border-border bg-surface p-8">
      <h1 className="text-xl leading-tight font-semibold">Staff sign-in</h1>
      <p className="text-text-secondary">
        Use your staff account. You&apos;ll confirm with your authenticator app
        next.
      </p>
      <SignInForm />
    </section>
  );
}

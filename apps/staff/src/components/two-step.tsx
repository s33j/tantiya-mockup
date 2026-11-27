"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@tantiya/supabase/client";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { authErrorMessage, codeSchema } from "@/lib/auth";
import { paths, reloadTo } from "@/lib/paths";
import { Field, FormError, PrimaryButton } from "./forms";
import { PhoneIcon, ShieldIcon } from "./icons";
import { SignOutButton } from "./sign-out-button";

type Step =
  | { kind: "challenge"; factorId: string }
  | { kind: "setup"; factorId: string; qrCode: string; secret: string };

// Decides between S3 (an authenticator app is already linked) and S2 (first
// time: link one now).
async function loadStep(): Promise<Step> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;

  const verified = data.totp[0];
  if (verified) return { kind: "challenge", factorId: verified.id };

  // A setup left unfinished earlier leaves an unverified factor; start clean.
  for (const factor of data.all) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: factor.id,
      });
      if (error) throw error;
    }
  }

  const enrolled = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Tantiya Staff",
    issuer: "Tantiya Staff",
  });
  if (enrolled.error) throw enrolled.error;

  return {
    kind: "setup",
    factorId: enrolled.data.id,
    qrCode: enrolled.data.totp.qr_code,
    secret: enrolled.data.totp.secret,
  };
}

export function TwoStep() {
  // Enrolling creates a new secret, so never refetch on focus or reconnect.
  const step = useQuery({
    queryKey: ["two-step"],
    queryFn: loadStep,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  if (step.isPending) {
    return (
      <Card>
        <p role="status" className="text-text-secondary">
          Loading…
        </p>
      </Card>
    );
  }

  if (step.isError) {
    return (
      <Card>
        <FormError message="Two-step sign-in couldn't load. Reload the page to try again." />
        <OtherAccount />
      </Card>
    );
  }

  return step.data.kind === "challenge" ? (
    <Card>
      <Heading icon={<PhoneIcon size={28} />}>Enter your code</Heading>
      <p className="text-text-secondary">
        Open your authenticator app and enter the 6-digit code for Tantiya
        Staff.
      </p>
      <CodeForm factorId={step.data.factorId} submitLabel="Verify" />
      <OtherAccount />
    </Card>
  ) : (
    <Card wide>
      <Heading icon={<ShieldIcon size={28} />}>Set up two-step sign-in</Heading>
      <p className="text-text-secondary">
        Every staff account needs it. KYC decisions are refused without it.
      </p>
      <ol className="flex flex-col gap-6">
        <StepItem number={1} title="Scan the code">
          <div className="flex flex-wrap items-start gap-5">
            {/* An SVG data URL from Supabase; next/image doesn't apply. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={step.data.qrCode}
              alt="QR code for your authenticator app"
              width={168}
              height={168}
              className="shrink-0 rounded-input bg-white p-2"
            />
            <div className="flex min-w-50 flex-1 flex-col gap-2">
              <p className="text-sm text-text-secondary">
                Open an authenticator app (for example Google Authenticator,
                Microsoft Authenticator or 1Password) and scan this code.
              </p>
              <p className="text-sm text-text-muted">
                Can&apos;t scan? Enter this key instead:
              </p>
              <code className="block rounded-input bg-surface-sunken px-3 py-2 text-sm tracking-widest break-all">
                {step.data.secret}
              </code>
            </div>
          </div>
        </StepItem>
        <StepItem number={2} title="Enter the code from the app">
          <CodeForm
            factorId={step.data.factorId}
            submitLabel="Turn on two-step sign-in"
            hint="The code changes every 30 seconds."
          />
        </StepItem>
      </ol>
      <p className="text-sm text-text-muted">
        Lost your phone? An admin resets your two-step sign-in.
      </p>
    </Card>
  );
}

function CodeForm({
  factorId,
  submitLabel,
  hint,
}: {
  factorId: string;
  submitLabel: string;
  hint?: string;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(async ({ code }) => {
        const { error } = await createClient().auth.mfa.challengeAndVerify({
          factorId,
          code,
        });
        if (error) {
          setError("root", { message: authErrorMessage(error) });
          return;
        }
        reloadTo(paths.home);
      })}
    >
      <Field
        label="6-digit code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        hint={hint}
        error={errors.code?.message}
        {...register("code")}
      />
      <FormError message={errors.root?.message} />
      <PrimaryButton disabled={isSubmitting}>{submitLabel}</PrimaryButton>
    </form>
  );
}

function Card({
  wide = false,
  children,
}: {
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`flex w-full flex-col gap-5 rounded-card border border-border bg-surface p-8 ${wide ? "max-w-150" : "max-w-110"}`}
    >
      {children}
    </section>
  );
}

function Heading({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex text-accent-text">{icon}</span>
      <h1 className="text-xl leading-tight font-semibold">{children}</h1>
    </div>
  );
}

function StepItem({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-accent-text text-sm font-semibold text-accent-text">
        {number}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 className="font-semibold">{title}</h2>
        {children}
      </div>
    </li>
  );
}

function OtherAccount() {
  return (
    <div className="self-center">
      <SignOutButton variant="link" label="Use a different account" />
    </div>
  );
}

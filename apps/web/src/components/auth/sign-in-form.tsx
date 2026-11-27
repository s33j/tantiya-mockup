"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { authErrorKey } from "@/lib/auth/errors";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { signInSchema } from "@/lib/auth/schemas";
import { useAuthRedirect } from "@/lib/auth/use-auth-redirect";
import { createClient } from "@tantiya/supabase/client";
import { FormError, FormField, SubmitButton } from "./form-controls";
import { ResendVerification } from "./resend-verification";

export function SignInForm() {
  const t = useTranslations("Auth");
  const authRedirect = useAuthRedirect();
  const searchParams = useSearchParams();
  const [unverifiedEmail, setUnverifiedEmail] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
  });

  // Set by /api/auth/confirm when an email link has expired or was already used.
  const linkError =
    searchParams.get("error") === "link" ? "linkInvalid" : undefined;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(async ({ email, password }) => {
        const { error } = await createClient().auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError("root", { message: authErrorKey(error) });
          setUnverifiedEmail(
            error.code === "email_not_confirmed" ? email : undefined,
          );
          return;
        }

        authRedirect(
          safeNextPath(
            searchParams.get("next"),
            window.location.origin,
            "/account",
          ),
        );
      })}
    >
      <FormError errorKey={errors.root ? undefined : linkError} />
      <FormField
        label={t("email")}
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <FormField
        label={t("password")}
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <FormError errorKey={errors.root?.message} />
      {unverifiedEmail && <ResendVerification email={unverifiedEmail} />}
      <SubmitButton disabled={isSubmitting}>{t("signIn")}</SubmitButton>
    </form>
  );
}

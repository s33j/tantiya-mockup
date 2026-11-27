"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { authErrorKey } from "@/lib/auth/errors";
import { forgotPasswordSchema } from "@/lib/auth/schemas";
import { createClient } from "@tantiya/supabase/client";
import {
  FormError,
  FormField,
  FormNotice,
  SubmitButton,
} from "./form-controls";

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<z.input<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  // The same notice either way, so this can't reveal who has an account.
  if (isSubmitSuccessful && !errors.root) {
    return <FormNotice>{t("resetEmailSent")}</FormNotice>;
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(async ({ email }) => {
        const { error } =
          await createClient().auth.resetPasswordForEmail(email);
        if (error) setError("root", { message: authErrorKey(error) });
      })}
    >
      <FormField
        label={t("email")}
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <FormError errorKey={errors.root?.message} />
      <SubmitButton disabled={isSubmitting}>{t("sendResetLink")}</SubmitButton>
    </form>
  );
}

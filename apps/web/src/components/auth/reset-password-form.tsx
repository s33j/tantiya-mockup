"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { authErrorKey } from "@/lib/auth/errors";
import { resetPasswordSchema } from "@/lib/auth/schemas";
import { useAuthRedirect } from "@/lib/auth/use-auth-redirect";
import { createClient } from "@tantiya/supabase/client";
import { FormError, FormField, SubmitButton } from "./form-controls";

export function ResetPasswordForm() {
  const t = useTranslations("Auth");
  const authRedirect = useAuthRedirect();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(async ({ password }) => {
        const { error } = await createClient().auth.updateUser({ password });

        if (error) {
          setError("root", { message: authErrorKey(error) });
          return;
        }

        authRedirect("/account");
      })}
    >
      <FormField
        label={t("newPassword")}
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <FormError errorKey={errors.root?.message} />
      <SubmitButton disabled={isSubmitting}>{t("savePassword")}</SubmitButton>
    </form>
  );
}

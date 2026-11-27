"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { authErrorKey } from "@/lib/auth/errors";
import { signUpSchema } from "@/lib/auth/schemas";
import { createClient } from "@tantiya/supabase/client";
import {
  CheckboxField,
  FormError,
  FormField,
  FormNotice,
  SubmitButton,
} from "./form-controls";
import { ResendVerification } from "./resend-verification";

export function SignUpForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [sentTo, setSentTo] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
  });

  if (sentTo) {
    return (
      <div className="flex flex-col gap-4">
        <FormNotice>{t("checkEmail", { email: sentTo })}</FormNotice>
        <ResendVerification email={sentTo} />
      </div>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(
        async ({ email, password, declared21Plus, declaredInPh }) => {
          // A database trigger copies this metadata into the user's profile.
          const { error } = await createClient().auth.signUp({
            email,
            password,
            options: {
              data: {
                locale,
                declared_21_plus: declared21Plus,
                declared_in_ph: declaredInPh,
              },
            },
          });

          if (error) {
            setError("root", { message: authErrorKey(error) });
          } else {
            setSentTo(email);
          }
        },
      )}
    >
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
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <CheckboxField
        label={t("declared21Plus")}
        error={errors.declared21Plus?.message}
        {...register("declared21Plus")}
      />
      <CheckboxField
        label={t("declaredInPh")}
        error={errors.declaredInPh?.message}
        {...register("declaredInPh")}
      />
      <FormError errorKey={errors.root?.message} />
      <SubmitButton disabled={isSubmitting}>{t("signUp")}</SubmitButton>
    </form>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@tantiya/supabase/client";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { authErrorMessage, signInSchema } from "@/lib/auth";
import { paths, reloadTo } from "@/lib/paths";
import { Field, FormError, PrimaryButton } from "./forms";

// S1. The proxy then sends the user to two-step sign-in, or to "not staff".
export function SignInForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
  });

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
          setError("root", { message: authErrorMessage(error) });
          return;
        }
        reloadTo(paths.twoStep);
      })}
    >
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Field
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <FormError message={errors.root?.message} />
      <PrimaryButton disabled={isSubmitting}>Continue</PrimaryButton>
    </form>
  );
}

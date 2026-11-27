"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { CheckboxField, FormError } from "@/components/auth/form-controls";
import { declarationsSchema } from "@/lib/auth/schemas";
import { createClient } from "@tantiya/supabase/client";
import { useKycStart } from "./kyc-start";
import { buttonClass } from "./kyc-ui";

// 10 · declarations_missing. Records both declarations through
// kyc_confirm_declarations, then starts the ID check like any start button.
export function ConfirmDeclarationsForm() {
  const tAuth = useTranslations("Auth");
  const t = useTranslations("Kyc.declarations");
  const { start, pending } = useKycStart();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof declarationsSchema>>({
    resolver: zodResolver(declarationsSchema),
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-2"
      onSubmit={handleSubmit(async ({ declared21Plus, declaredInPh }) => {
        const { error } = await createClient().rpc("kyc_confirm_declarations", {
          p_declared_21_plus: declared21Plus,
          p_declared_in_ph: declaredInPh,
        });
        if (error) {
          setError("root", { message: "generic" });
          return;
        }
        start();
      })}
    >
      <CheckboxField
        label={tAuth("declared21Plus")}
        error={errors.declared21Plus?.message}
        {...register("declared21Plus")}
      />
      <CheckboxField
        label={tAuth("declaredInPh")}
        error={errors.declaredInPh?.message}
        {...register("declaredInPh")}
      />
      <FormError errorKey={errors.root?.message} />
      <button
        type="submit"
        disabled={isSubmitting || pending}
        className={`mt-2 ${buttonClass.primary}`}
      >
        {t("submit")}
      </button>
    </form>
  );
}

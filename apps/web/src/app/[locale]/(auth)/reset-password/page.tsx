import { getTranslations } from "next-intl/server";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

// The proxy sends guests to sign-in; the email link signs the user in first.
export default async function ResetPasswordPage() {
  const t = await getTranslations("Auth");

  return (
    <>
      <h1 className="text-xl font-semibold">{t("resetPasswordTitle")}</h1>
      <ResetPasswordForm />
    </>
  );
}

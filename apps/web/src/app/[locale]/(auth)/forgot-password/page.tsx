import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Link } from "@/i18n/navigation";

export default async function ForgotPasswordPage() {
  const t = await getTranslations("Auth");

  return (
    <>
      <h1 className="text-xl font-semibold">{t("forgotPasswordTitle")}</h1>
      <ForgotPasswordForm />
      <Link href="/sign-in" className="text-sm font-semibold text-accent-text">
        {t("backToSignIn")}
      </Link>
    </>
  );
}

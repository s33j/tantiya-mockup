import { getTranslations } from "next-intl/server";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { Link } from "@/i18n/navigation";

export default async function SignUpPage() {
  const t = await getTranslations("Auth");

  return (
    <>
      <h1 className="text-xl font-semibold">{t("signUpTitle")}</h1>
      <SignUpForm />
      <p className="text-sm text-text-muted">
        {t("haveAccount")}{" "}
        <Link href="/sign-in" className="font-semibold text-accent-text">
          {t("signIn")}
        </Link>
      </p>
    </>
  );
}

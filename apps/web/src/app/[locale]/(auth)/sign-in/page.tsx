import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Link } from "@/i18n/navigation";

export default async function SignInPage() {
  const t = await getTranslations("Auth");

  return (
    <>
      <h1 className="text-xl font-semibold">{t("signInTitle")}</h1>
      {/* The form reads the URL's search params, which aren't known at build time. */}
      <Suspense>
        <SignInForm />
      </Suspense>
      <div className="flex flex-col gap-2 text-sm text-text-muted">
        <Link
          href="/forgot-password"
          className="font-semibold text-accent-text"
        >
          {t("forgotPassword")}
        </Link>
        <p>
          {t("noAccount")}{" "}
          <Link href="/sign-up" className="font-semibold text-accent-text">
            {t("signUp")}
          </Link>
        </p>
      </div>
    </>
  );
}

import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Composer } from "@/components/community/composer";
import { DisplayNameForm } from "@/components/community/display-name-form";
import { AccountGate } from "@/components/markets/account-gate";
import { getViewer, listAttachableMarkets } from "@/lib/community/data";

// New post (mockup 3.03). A display name comes first if the member has none.
async function NewPost({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/community/new">["searchParams"];
}) {
  const t = await getTranslations("Community");
  const viewer = await getViewer();
  if (viewer.kind === "guest") {
    return (
      <AccountGate
        message={t("signIn")}
        link={t("signInLink")}
        href="/sign-in?next=/community/new"
      />
    );
  }
  if (!viewer.approved) {
    return (
      <AccountGate
        message={t("readOnly")}
        link={t("checkAccount")}
        href="/account"
      />
    );
  }
  const locale = await getLocale();
  const [markets, messages] = await Promise.all([
    listAttachableMarkets(locale),
    getMessages(),
  ]);
  const slug = (await searchParams).market;
  const initial = markets.find((m) => m.slug === slug)?.id ?? null;

  return (
    <NextIntlClientProvider messages={{ Community: messages.Community }}>
      {viewer.displayName === null ? (
        <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
          <h2 className="font-semibold">{t("chooseName")}</h2>
          <DisplayNameForm current={null} />
        </section>
      ) : (
        <>
          <p className="text-sm text-text-secondary">
            {t("postingAs", { name: viewer.displayName })}
          </p>
          <Composer markets={markets} initialMarketId={initial} />
        </>
      )}
      <p className="text-xs text-text-muted">{t("guidelines")}</p>
    </NextIntlClientProvider>
  );
}

export default async function NewPostPage({
  searchParams,
}: PageProps<"/[locale]/community/new">) {
  const t = await getTranslations("Community");
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("newPost")}</h1>
      <Suspense>
        <NewPost searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

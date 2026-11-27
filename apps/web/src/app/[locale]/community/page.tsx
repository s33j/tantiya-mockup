import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { buttonClass } from "@/components/kyc/kyc-ui";
import { AccountGate } from "@/components/markets/account-gate";
import { PostCard } from "@/components/community/post-card";
import { Link } from "@/i18n/navigation";
import { getViewer, listPosts } from "@/lib/community/data";

// Community feed (mockup 3.01): newest first, or most liked. Signed-in members
// read; approved members with a display name post, like and comment.
async function Feed({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/community">["searchParams"];
}) {
  const t = await getTranslations("Community");
  const viewer = await getViewer();
  if (viewer.kind === "guest") {
    return (
      <AccountGate
        message={t("signIn")}
        link={t("signInLink")}
        href="/sign-in?next=/community"
      />
    );
  }
  const sort = (await searchParams).sort === "top" ? "top" : "latest";
  const [posts, messages] = await Promise.all([
    listPosts({ locale: await getLocale(), viewerId: viewer.userId, sort }),
    getMessages(),
  ]);
  const canInteract = viewer.approved && viewer.displayName !== null;

  return (
    <NextIntlClientProvider messages={{ Community: messages.Community }}>
      <div className="flex items-center gap-3">
        <nav
          aria-label={t("sort")}
          className="flex gap-5 border-b border-border"
        >
          {(["latest", "top"] as const).map((s) => (
            <Link
              key={s}
              href={s === "top" ? "/community?sort=top" : "/community"}
              aria-current={sort === s ? "page" : undefined}
              className={`border-b-2 py-2 ${sort === s ? "border-accent font-semibold text-text" : "border-transparent text-text-muted"}`}
            >
              {t(s)}
            </Link>
          ))}
        </nav>
        {viewer.approved && (
          <Link
            href="/community/new"
            className={`${buttonClass.primary} ml-auto`}
          >
            {t("newPost")}
          </Link>
        )}
      </div>
      {!viewer.approved && (
        <p className="text-sm text-text-secondary">{t("readOnly")}</p>
      )}
      <p className="text-xs text-text-muted">{t("guidelines")}</p>
      {posts.length === 0 ? (
        <p className="text-text-secondary">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((p) => (
            <li key={p.id}>
              <PostCard
                post={p}
                viewerId={viewer.userId}
                canInteract={canInteract}
              />
            </li>
          ))}
        </ul>
      )}
    </NextIntlClientProvider>
  );
}

export default async function CommunityPage({
  searchParams,
}: PageProps<"/[locale]/community">) {
  const t = await getTranslations("Community");
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <Suspense>
        <Feed searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

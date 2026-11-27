import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DisplayNameForm } from "@/components/community/display-name-form";
import { initials, PostCard } from "@/components/community/post-card";
import { AccountGate } from "@/components/markets/account-gate";
import { getMember, getViewer, listPosts } from "@/lib/community/data";

// Simple profile (mockup 3.09): display name, month joined and posts. No coins,
// winnings or balances. On your own profile you can change your display name.
async function Profile({
  params,
}: {
  params: PageProps<"/[locale]/community/members/[id]">["params"];
}) {
  const t = await getTranslations("Community");
  const { id } = await params;
  const viewer = await getViewer();
  if (viewer.kind === "guest") {
    return (
      <AccountGate
        message={t("signIn")}
        link={t("signInLink")}
        href={`/sign-in?next=/community/members/${id}`}
      />
    );
  }
  const locale = await getLocale();
  const [member, messages] = await Promise.all([getMember(id), getMessages()]);
  if (!member) notFound();
  const own = member.id === viewer.userId;
  const posts = await listPosts({
    locale,
    viewerId: viewer.userId,
    authorId: member.id,
  });
  const canInteract = viewer.approved && viewer.displayName !== null;
  const joined = new Intl.DateTimeFormat(
    locale === "fil" ? "fil-PH" : "en-PH",
    {
      month: "long",
      year: "numeric",
      timeZone: "Asia/Manila",
    },
  ).format(new Date(member.joined));

  return (
    <NextIntlClientProvider messages={{ Community: messages.Community }}>
      <header className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full border border-border-strong bg-surface-sunken text-xl font-bold text-text-secondary"
        >
          {initials(member.name)}
        </span>
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold">{member.name}</h1>
          <span className="text-sm text-text-secondary">
            <span className="text-accent-text">{t("verified")}</span> ·{" "}
            {t("joined", { date: joined })}
          </span>
          <span className="text-sm text-text-muted">
            {t("postCount", { count: posts.length })}
          </span>
        </div>
      </header>
      {own && (
        <section className="rounded-card border border-border bg-surface p-4">
          <DisplayNameForm current={member.name} />
        </section>
      )}
      {posts.length === 0 ? (
        <p className="text-text-secondary">{t("noPosts")}</p>
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

export default function MemberPage({
  params,
}: PageProps<"/[locale]/community/members/[id]">) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Suspense>
        <Profile params={params} />
      </Suspense>
    </div>
  );
}

import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CommentForm } from "@/components/community/comment-form";
import { initials, PostCard } from "@/components/community/post-card";
import { AccountGate } from "@/components/markets/account-gate";
import { Link } from "@/i18n/navigation";
import { getPost, getViewer, listComments } from "@/lib/community/data";
import { formatPht } from "@/lib/markets/format";

// Post detail with comments (mockup 3.05).
async function PostDetail({
  params,
}: {
  params: PageProps<"/[locale]/community/[id]">["params"];
}) {
  const t = await getTranslations("Community");
  const { id } = await params;
  const viewer = await getViewer();
  if (viewer.kind === "guest") {
    return (
      <AccountGate
        message={t("signIn")}
        link={t("signInLink")}
        href={`/sign-in?next=/community/${id}`}
      />
    );
  }
  const postId = Number(id);
  if (!Number.isInteger(postId)) notFound();
  const locale = await getLocale();
  const [post, comments, messages] = await Promise.all([
    getPost(postId, locale, viewer.userId),
    listComments(postId),
    getMessages(),
  ]);
  if (!post) notFound();
  const canInteract =
    viewer.approved && viewer.displayName !== null && !post.hidden;

  return (
    <NextIntlClientProvider messages={{ Community: messages.Community }}>
      <PostCard
        post={post}
        viewerId={viewer.userId}
        canInteract={canInteract}
        full
      />
      <section
        id="comments"
        aria-labelledby="comments-title"
        className="flex flex-col gap-3"
      >
        <h2
          id="comments-title"
          className="text-sm font-semibold text-text-secondary"
        >
          {t("commentsTitle", { count: comments.length })}
        </h2>
        {comments.length === 0 && (
          <p className="text-sm text-text-secondary">{t("noComments")}</p>
        )}
        <ul className="flex flex-col">
          {comments.map((c) => {
            const name = c.authorName ?? t("formerMember");
            return (
              <li
                key={c.id}
                className="flex gap-2.5 border-t border-border py-3"
              >
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-sunken text-xs font-bold text-text-secondary"
                >
                  {initials(name)}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm">
                    <Link
                      href={`/community/members/${c.authorId}`}
                      className="font-semibold text-text"
                    >
                      {name}
                    </Link>{" "}
                    <span className="text-xs text-text-muted">
                      {formatPht(c.createdAt, locale)}
                    </span>
                  </span>
                  <p className="whitespace-pre-wrap text-sm">{c.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
        {canInteract ? (
          <CommentForm postId={post.id} userId={viewer.userId} />
        ) : (
          !post.hidden && (
            <p className="text-sm text-text-secondary">
              {viewer.approved ? t("nameToComment") : t("readOnly")}{" "}
              {viewer.approved && (
                <Link
                  href="/community/new"
                  className="font-semibold text-accent-text"
                >
                  {t("chooseName")}
                </Link>
              )}
            </p>
          )
        )}
      </section>
    </NextIntlClientProvider>
  );
}

export default async function PostPage({
  params,
}: PageProps<"/[locale]/community/[id]">) {
  const t = await getTranslations("Community");
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Link
        href="/community"
        className="self-start text-sm font-semibold text-accent-text"
      >
        {t("back")}
      </Link>
      <Suspense>
        <PostDetail params={params} />
      </Suspense>
    </div>
  );
}

import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Post } from "@/lib/community/data";
import { formatAmerican, formatPht } from "@/lib/markets/format";
import { LikeButton } from "./like-button";
import { ReportButton } from "./report-button";
import { ShareButton } from "./share-button";

// One post (mockup 3.01 feed card, 3.05 detail). The market card shows the
// current lines and the author's side, never stakes or winnings. Members who
// can't take part (under review, no name) see the counts without the buttons.
export async function PostCard({
  post,
  viewerId,
  canInteract,
  full = false,
}: {
  post: Post;
  viewerId: string;
  canInteract: boolean;
  full?: boolean;
}) {
  const t = await getTranslations("Community");
  const locale = await getLocale();
  const name = post.authorName ?? t("formerMember");

  return (
    <article className="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-4">
      <header className="flex items-center gap-2.5 text-sm">
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-sunken text-xs font-bold text-text-secondary"
        >
          {initials(name)}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="flex flex-wrap items-center gap-x-1.5">
            <Link
              href={`/community/members/${post.authorId}`}
              className="font-semibold text-text"
            >
              {name}
            </Link>
            <span className="text-xs text-accent-text">{t("verified")}</span>
          </span>
          <span className="text-xs text-text-muted">
            {formatPht(post.createdAt, locale)}
          </span>
        </div>
      </header>

      {post.hidden && (
        <p className="rounded-input bg-surface-sunken p-2.5 text-sm text-text-secondary">
          {t("hiddenNote")}
        </p>
      )}

      {full ? (
        <p className="whitespace-pre-wrap">{post.body}</p>
      ) : (
        <Link
          href={`/community/${post.id}`}
          className="whitespace-pre-wrap text-text"
        >
          {post.body}
        </Link>
      )}

      {post.market && (
        <Link
          href={`/markets/${post.market.slug}`}
          className="flex flex-col gap-1 rounded-input border border-border-strong bg-surface-sunken px-3 py-2"
        >
          <span className="text-sm font-semibold leading-snug text-text">
            {post.market.question}
          </span>
          <span className="text-xs text-text-secondary tabular-nums">
            {post.market.outcomes
              .map((o) => `${o.label} ${formatAmerican(o.odds)}`)
              .join(" · ")}
          </span>
          {post.forecastLabel && (
            <span className="text-xs text-text-secondary">
              {t("forecast")}{" "}
              <strong
                className={
                  post.forecastPosition === 0 ? "text-yes-text" : "text-no-text"
                }
              >
                {post.forecastLabel}
              </strong>
            </span>
          )}
        </Link>
      )}

      <div className="-mx-2 -mb-1 flex items-center gap-1 text-sm text-text-secondary">
        <LikeButton
          postId={post.id}
          userId={viewerId}
          liked={post.likedByMe}
          count={post.likes}
          enabled={canInteract && !post.hidden}
        />
        <Link
          href={`/community/${post.id}#comments`}
          className="flex min-h-10 items-center gap-1.5 rounded-input px-2 text-text-secondary"
          aria-label={t("commentsLabel", { count: post.comments })}
        >
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 5h14v10H10l-5 4z" />
          </svg>
          <span className="tabular-nums">{post.comments}</span>
        </Link>
        <ShareButton path={`/community/${post.id}`} />
        {post.authorId !== viewerId && !post.hidden && (
          <span className="ml-auto">
            <ReportButton postId={post.id} userId={viewerId} />
          </span>
        )}
      </div>
    </article>
  );
}

export function initials(name: string) {
  return name
    .replace(/\[SAMPLE\]\s*/, "")
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

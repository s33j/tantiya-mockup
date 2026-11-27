import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getViewer, listPosts } from "@/lib/community/data";
import { PostCard } from "./post-card";

// The market page's Discussion section (mockup 3.02): the latest posts that
// carry this market's card, and a link to post about it.
export async function MarketDiscussion({ slug }: { slug: string }) {
  const t = await getTranslations("Community");
  const viewer = await getViewer();

  return (
    <section aria-labelledby="discussion-title" className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h2 id="discussion-title" className="font-semibold">
          {t("discussion")}
        </h2>
        {viewer.kind === "member" && viewer.approved && (
          <Link
            href={`/community/new?market=${slug}`}
            className="ml-auto text-sm font-semibold text-accent-text"
          >
            {t("postAboutMarket")}
          </Link>
        )}
      </div>
      {viewer.kind === "guest" ? (
        <p className="text-sm text-text-secondary">
          <Link
            href={`/sign-in?next=/markets/${slug}`}
            className="font-semibold text-accent-text"
          >
            {t("signInLink")}
          </Link>{" "}
          {t("signInToRead")}
        </p>
      ) : (
        <Posts
          slug={slug}
          viewerId={viewer.userId}
          canInteract={viewer.approved && viewer.displayName !== null}
        />
      )}
    </section>
  );
}

async function Posts({
  slug,
  viewerId,
  canInteract,
}: {
  slug: string;
  viewerId: string;
  canInteract: boolean;
}) {
  const t = await getTranslations("Community");
  const posts = await listPosts({
    locale: await getLocale(),
    viewerId,
    marketSlug: slug,
    limit: 5,
  });
  if (posts.length === 0)
    return <p className="text-sm text-text-secondary">{t("noDiscussion")}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {posts.map((p) => (
        <li key={p.id}>
          <PostCard post={p} viewerId={viewerId} canInteract={canInteract} />
        </li>
      ))}
    </ul>
  );
}

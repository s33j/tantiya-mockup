import "server-only";
import { createClient } from "@tantiya/supabase/server";

// Reads for Community (mockup flow 3; migration 20261127000300_community.sql).
// Signed-in accounts can read; RLS hides posts that moderators hid, except from
// their author. Names come from member_profiles (display names of approved
// accounts only). Likes and comments are counted here; POC volumes are small.

export type Viewer =
  | { kind: "guest" }
  | {
      kind: "member";
      userId: string;
      approved: boolean;
      displayName: string | null;
    };

export type PostMarket = {
  slug: string;
  question: string;
  outcomes: { id: number; position: number; label: string; odds: number }[];
};

export type Post = {
  id: number;
  authorId: string;
  authorName: string | null;
  body: string;
  createdAt: string;
  hidden: boolean;
  market: PostMarket | null;
  forecastLabel: string | null;
  forecastPosition: number | null;
  likes: number;
  likedByMe: boolean;
  comments: number;
};

export type Comment = {
  id: number;
  authorId: string;
  authorName: string | null;
  body: string;
  createdAt: string;
};

export type Member = { id: string; name: string; joined: string };

type PostRow = {
  id: number;
  author_id: string;
  body: string;
  created_at: string;
  hidden_at: string | null;
  market_id: number | null;
  forecast_outcome_id: number | null;
};

const POST_COLUMNS =
  "id, author_id, body, created_at, hidden_at, market_id, forecast_outcome_id";

export async function getViewer(): Promise<Viewer> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { kind: "guest" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("status, display_name")
    .eq("id", userId)
    .maybeSingle();
  return {
    kind: "member",
    userId,
    approved: profile?.status === "approved",
    displayName: profile?.display_name ?? null,
  };
}

async function names(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_profiles")
    .select("id, display_name")
    .in("id", [...new Set(ids)]);
  if (error) throw error;
  return new Map(
    (data ?? [])
      .filter((m) => m.display_name)
      .map((m) => [m.id as string, m.display_name as string]),
  );
}

// Posts with their names, market cards, like and comment counts.
async function withDetails(
  rows: PostRow[],
  locale: string,
  viewerId: string,
): Promise<Post[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();
  const fil = locale === "fil";
  const postIds = rows.map((r) => r.id);
  const marketIds = [
    ...new Set(rows.map((r) => r.market_id).filter((id) => id !== null)),
  ];

  const [nameMap, likes, comments, markets] = await Promise.all([
    names(rows.map((r) => r.author_id)),
    supabase
      .from("post_likes")
      .select("post_id, user_id")
      .in("post_id", postIds),
    supabase.from("post_comments").select("post_id").in("post_id", postIds),
    marketIds.length
      ? supabase
          .from("markets")
          .select(
            "id, slug, question_en, question_fil, market_outcomes(id, position, label_en, label_fil, odds)",
          )
          .in("id", marketIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const r of [likes, comments, markets]) if (r.error) throw r.error;

  const marketById = new Map(
    (
      (markets.data ?? []) as {
        id: number;
        slug: string;
        question_en: string;
        question_fil: string;
        market_outcomes: {
          id: number;
          position: number;
          label_en: string;
          label_fil: string;
          odds: number;
        }[];
      }[]
    ).map((m) => [
      m.id,
      {
        slug: m.slug,
        question: fil ? m.question_fil : m.question_en,
        outcomes: [...m.market_outcomes]
          .sort((a, z) => a.position - z.position)
          .map((o) => ({
            id: o.id,
            position: o.position,
            label: fil ? o.label_fil : o.label_en,
            odds: o.odds,
          })),
      } satisfies PostMarket,
    ]),
  );

  return rows.map((r) => {
    const market = r.market_id ? (marketById.get(r.market_id) ?? null) : null;
    const forecast = market?.outcomes.find(
      (o) => o.id === r.forecast_outcome_id,
    );
    const postLikes = (likes.data ?? []).filter((l) => l.post_id === r.id);
    return {
      id: r.id,
      authorId: r.author_id,
      authorName: nameMap.get(r.author_id) ?? null,
      body: r.body,
      createdAt: r.created_at,
      hidden: r.hidden_at !== null,
      market,
      forecastLabel: forecast?.label ?? null,
      forecastPosition: forecast?.position ?? null,
      likes: postLikes.length,
      likedByMe: postLikes.some((l) => l.user_id === viewerId),
      comments: (comments.data ?? []).filter((c) => c.post_id === r.id).length,
    };
  });
}

export async function listPosts(opts: {
  locale: string;
  viewerId: string;
  marketSlug?: string;
  authorId?: string;
  sort?: "latest" | "top";
  limit?: number;
}): Promise<Post[]> {
  const supabase = await createClient();
  let query = supabase
    .from("posts")
    .select(POST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.authorId) query = query.eq("author_id", opts.authorId);
  if (opts.marketSlug) {
    const { data: m } = await supabase
      .from("markets")
      .select("id")
      .eq("slug", opts.marketSlug)
      .maybeSingle();
    if (!m) return [];
    query = query.eq("market_id", m.id);
  }
  const { data, error } = await query;
  if (error) throw error;
  // Others never see hidden posts (RLS); authors see theirs only on their profile.
  const rows = ((data ?? []) as PostRow[]).filter(
    (r) => !r.hidden_at || opts.authorId === opts.viewerId,
  );
  const posts = await withDetails(rows, opts.locale, opts.viewerId);
  if (opts.sort === "top") posts.sort((a, z) => z.likes - a.likes);
  return posts;
}

export async function getPost(
  id: number,
  locale: string,
  viewerId: string,
): Promise<Post | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [post] = await withDetails([data as PostRow], locale, viewerId);
  return post;
}

export async function listComments(postId: number): Promise<Comment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("post_comments")
    .select("id, author_id, body, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  const rows = data ?? [];
  const nameMap = await names(rows.map((r) => r.author_id as string));
  return rows.map((r) => ({
    id: r.id as number,
    authorId: r.author_id as string,
    authorName: nameMap.get(r.author_id as string) ?? null,
    body: r.body as string,
    createdAt: r.created_at as string,
  }));
}

export async function getMember(id: string): Promise<Member | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_profiles")
    .select("id, display_name, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data?.display_name) return null;
  return {
    id: data.id as string,
    name: data.display_name as string,
    joined: data.created_at as string,
  };
}

// Open markets for the composer's market picker.
export async function listAttachableMarkets(locale: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("markets")
    .select("id, slug, question_en, question_fil")
    .eq("status", "open")
    .order("closes_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((m) => ({
    id: m.id as number,
    slug: m.slug as string,
    question: (locale === "fil" ? m.question_fil : m.question_en) as string,
  }));
}

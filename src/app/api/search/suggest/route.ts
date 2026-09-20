import { getWallpapers } from "@/lib/wallpapers";
import { getCategories } from "@/lib/categories";
import { getPopularTags, getTrendingKeywords } from "@/lib/search-log";
import { matchesAllTokens, normalizeSearch, searchTokens } from "@/lib/search-text";
import { coverOf } from "@/lib/cover";

export type SuggestResponse = {
  query: string;
  wallpapers: { slug: string; title: string; image: string; mediaType: "image" | "video" }[];
  categories: { slug: string; name: string; icon: string }[];
  tags: string[];
  /** Chỉ có khi ô tìm kiếm trống. */
  trending?: string[];
};

const MAX_QUERY = 100;

/**
 * GET /api/search/suggest?q= — gợi ý cho ô tìm kiếm.
 * q trống: từ khoá thịnh hành + danh mục nổi bật. Có q: hình nền, danh mục, tag khớp.
 */
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, MAX_QUERY);
  const tokens = searchTokens(q);
  const categories = await getCategories();

  if (!tokens.length) {
    const body: SuggestResponse = {
      query: "",
      wallpapers: [],
      tags: [],
      categories: categories
        .filter((c) => !c.parentId)
        .slice(0, 8)
        .map((c) => ({ slug: c.slug, name: c.name, icon: c.icon })),
      trending: await getTrendingKeywords(8),
    };
    return Response.json(body, { headers: { "Cache-Control": "public, max-age=60" } });
  }

  const matches = (text: string) => matchesAllTokens(normalizeSearch(text), tokens);

  const [{ items }, tags] = await Promise.all([getWallpapers({ q, page: 1, limit: 6 }), getPopularTags()]);

  const body: SuggestResponse = {
    query: q,
    wallpapers: items.map((w) => ({
      slug: w.slug,
      title: w.title,
      image: coverOf(w).url,
      mediaType: w.mediaType,
    })),
    categories: categories
      .filter((c) => matches(c.name))
      .slice(0, 4)
      .map((c) => ({ slug: c.slug, name: c.name, icon: c.icon })),
    tags: tags
      .filter((t) => matches(t.tag) && normalizeSearch(t.tag) !== normalizeSearch(q))
      .slice(0, 5)
      .map((t) => t.tag),
  };
  return Response.json(body, { headers: { "Cache-Control": "public, max-age=30" } });
}

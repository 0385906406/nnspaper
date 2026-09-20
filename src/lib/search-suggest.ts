import "server-only";
import { getCategories, type CategoryView } from "@/lib/categories";
import { getPopularTags, getTrendingKeywords } from "@/lib/search-log";
import { normalizeSearch, searchTokens } from "@/lib/search-text";

/** Khoảng cách chỉnh sửa (Levenshtein) — để bắt lỗi gõ như "phong cnah". */
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 3) return 99;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

export type NoResultSuggestions = {
  /** Từ khoá gần đúng / nới lỏng để thử lại. */
  keywords: string[];
  categories: Pick<CategoryView, "slug" | "name" | "icon">[];
};

/**
 * Gợi ý khi tìm không ra: từ khoá gần giống (sai chính tả), tag chứa một phần từ
 * khoá, danh mục liên quan; thiếu thì lấy từ khoá thịnh hành bù vào.
 */
export async function getNoResultSuggestions(q: string): Promise<NoResultSuggestions> {
  const query = normalizeSearch(q);
  const tokens = searchTokens(q);
  const [tags, categories, trending] = await Promise.all([getPopularTags(), getCategories(), getTrendingKeywords(6)]);

  const scored = tags
    .map(({ tag, count }) => {
      const norm = normalizeSearch(tag);
      const distance = editDistance(query, norm);
      const partial = tokens.some((t) => t.length >= 2 && norm.split(" ").some((w) => w.startsWith(t) || t.startsWith(w)));
      const tolerance = query.length <= 4 ? 1 : 2;
      return { tag, count, score: distance <= tolerance ? 100 - distance * 10 : partial ? 50 : 0 };
    })
    .filter((t) => t.score > 0 && normalizeSearch(t.tag) !== query)
    .sort((a, b) => b.score - a.score || b.count - a.count);

  const keywords = [...new Set([...scored.map((t) => t.tag), ...trending])].slice(0, 6);

  const related = categories.filter((c) => {
    const name = normalizeSearch(c.name);
    return tokens.some((t) => t.length >= 2 && (name.includes(t) || editDistance(t, name) <= 1));
  });
  const fallback = categories.filter((c) => !c.parentId);

  return {
    keywords,
    categories: (related.length ? related : fallback)
      .slice(0, 6)
      .map((c) => ({ slug: c.slug, name: c.name, icon: c.icon })),
  };
}

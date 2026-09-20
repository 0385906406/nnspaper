import "server-only";
import { withDb } from "@/lib/data-source";
import { normalizeSearch } from "@/lib/search-text";
import { SearchLog } from "@/models/SearchLog";
import { Wallpaper } from "@/models/Wallpaper";

const DAY_MS = 24 * 3600 * 1000;

/** Ghi một lượt tìm kiếm. Lỗi chỉ ghi log — thống kê không được làm hỏng trang kết quả. */
export async function logSearch(query: string, results: number): Promise<void> {
  const term = normalizeSearch(query);
  if (!term || term.length > 100) return;
  try {
    await withDb(
      async () => {
        await SearchLog.create({ term, display: query.trim().slice(0, 100), results });
      },
      () => undefined
    );
  } catch (error) {
    console.error("[search-log]", error);
  }
}

export type TermStat = {
  term: string;
  display: string;
  count: number;
  lastResults: number;
  lastAt: string;
};

/** Từ khoá được tìm nhiều nhất trong `days` ngày; `zeroOnly` = chỉ những lần không ra kết quả. */
export async function getTopTerms(days: number, limit: number, zeroOnly = false): Promise<TermStat[]> {
  return withDb(
    async () => {
      const match: Record<string, unknown> = { createdAt: { $gte: new Date(Date.now() - days * DAY_MS) } };
      if (zeroOnly) match.results = 0;
      const rows = await SearchLog.aggregate<{
        _id: string;
        display: string;
        count: number;
        lastResults: number;
        lastAt: Date;
      }>([
        { $match: match },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$term",
            display: { $first: "$display" },
            count: { $sum: 1 },
            lastResults: { $first: "$results" },
            lastAt: { $first: "$createdAt" },
          },
        },
        { $sort: { count: -1, lastAt: -1 } },
        { $limit: limit },
      ]);
      return rows.map((r) => ({
        term: r._id,
        display: r.display,
        count: r.count,
        lastResults: r.lastResults,
        lastAt: new Date(r.lastAt).toISOString(),
      }));
    },
    () => []
  );
}

let tagCache: { at: number; tags: { tag: string; count: number }[] } | null = null;

/** Tag phổ biến của hình nền đã đăng (cache 5 phút) — dùng cho gợi ý và dự phòng thịnh hành. */
export async function getPopularTags(): Promise<{ tag: string; count: number }[]> {
  if (tagCache && Date.now() - tagCache.at < 5 * 60 * 1000) return tagCache.tags;
  const tags = await withDb(
    async () =>
      (
        await Wallpaper.aggregate<{ _id: string; count: number }>([
          { $match: { status: "published" } },
          { $unwind: "$tags" },
          { $group: { _id: "$tags", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 300 },
        ])
      ).map((t) => ({ tag: t._id, count: t.count })),
    () => []
  );
  tagCache = { at: Date.now(), tags };
  return tags;
}

/** Từ khoá thịnh hành cho ô tìm kiếm: tìm nhiều trong 7 ngày (có kết quả), thiếu thì bù bằng tag phổ biến. */
export async function getTrendingKeywords(limit = 8): Promise<string[]> {
  const [terms, tags] = await Promise.all([getTopTerms(7, limit * 2), getPopularTags()]);
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (label: string) => {
    const key = normalizeSearch(label);
    if (!key || seen.has(key) || out.length >= limit) return;
    seen.add(key);
    out.push(label);
  };
  terms.filter((t) => t.lastResults > 0 && t.count >= 2).forEach((t) => add(t.display));
  tags.forEach((t) => add(t.tag));
  return out;
}

/** Số lượt tìm, số từ khoá khác nhau và số lượt không ra kết quả trong `days` ngày. */
export async function getSearchSummary(days: number): Promise<{ searches: number; terms: number; zero: number }> {
  return withDb(
    async () => {
      const [row] = await SearchLog.aggregate<{ searches: number; zero: number; terms: string[] }>([
        { $match: { createdAt: { $gte: new Date(Date.now() - days * DAY_MS) } } },
        {
          $group: {
            _id: null,
            searches: { $sum: 1 },
            zero: { $sum: { $cond: [{ $eq: ["$results", 0] }, 1, 0] } },
            terms: { $addToSet: "$term" },
          },
        },
      ]);
      return { searches: row?.searches ?? 0, zero: row?.zero ?? 0, terms: row?.terms.length ?? 0 };
    },
    () => ({ searches: 0, terms: 0, zero: 0 })
  );
}

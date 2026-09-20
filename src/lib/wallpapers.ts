import "server-only";
import { cache } from "react";
import slugify from "slugify";
import { withDb } from "@/lib/data-source";
import { getSettings } from "@/lib/settings";
import { getCategorySlugsWithChildren } from "@/lib/categories";
import { Wallpaper, type WallpaperDoc } from "@/models/Wallpaper";
import { buildSearchText, normalizeSearch, searchTokens, wordPrefixPattern } from "@/lib/search-text";
import {
  getMockRelatedWallpapers,
  getMockWallpaperBySlug,
  getMockWallpapersForSitemap,
  incrementMockDownloads,
  incrementMockViews,
  queryMockTrendingWallpapers,
  queryMockWallpapers,
} from "@/lib/mock-data";

export type DeviceFilter = "pc" | "phone";

export type MediaView = {
  url: string;
  publicId: string;
  resourceType: "image" | "video";
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  duration?: number;
  alt: string;
};

export type WallpaperSeo = {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  canonical: string;
  noindex: boolean;
};

/** Kiểu dữ liệu đã "làm phẳng" để truyền an toàn từ Server Component sang client. */
export type WallpaperView = {
  id: string;
  title: string;
  slug: string;
  description: string;
  categoryName: string;
  categorySlug: string;
  deviceType: "pc" | "phone" | "both";
  mediaType: "image" | "video";
  media: MediaView;
  thumbnail: MediaView | null;
  resolutionLabel: string;
  tags: string[];
  source: string;
  likes: number;
  dislikes: number;
  downloads: number;
  views: number;
  commentCount: number;
  allowComments: boolean;
  status: "draft" | "published";
  publishedAt: string | null;
  updatedAt: string;
  seo: WallpaperSeo;
};

const emptySeo: WallpaperSeo = { metaTitle: "", metaDescription: "", keywords: [], canonical: "", noindex: false };

function toMediaView(media: WallpaperDoc["media"] | null | undefined): MediaView | null {
  if (!media) return null;
  return {
    url: media.url,
    publicId: media.publicId,
    resourceType: (media.resourceType as "image" | "video") ?? "image",
    width: media.width ?? undefined,
    height: media.height ?? undefined,
    format: media.format ?? undefined,
    bytes: media.bytes ?? undefined,
    duration: media.duration ?? undefined,
    alt: media.alt ?? "",
  };
}

/** Mongoose document -> object JSON thuần (Server Component không serialize được ObjectId/Date). */
export function toWallpaperView(doc: Record<string, unknown>): WallpaperView {
  const raw = doc as never as WallpaperDoc & {
    _id: { toString(): string };
    createdAt: Date;
    updatedAt: Date;
  };

  return {
    id: String(raw._id),
    title: raw.title,
    slug: raw.slug,
    description: raw.description ?? "",
    categoryName: raw.categoryName,
    categorySlug: raw.categorySlug,
    deviceType: raw.deviceType as "pc" | "phone" | "both",
    mediaType: raw.mediaType as "image" | "video",
    media: toMediaView(raw.media) as MediaView,
    thumbnail: toMediaView(raw.thumbnail),
    resolutionLabel: raw.resolutionLabel ?? "",
    tags: raw.tags ?? [],
    source: raw.source ?? "",
    likes: raw.likes ?? 0,
    dislikes: raw.dislikes ?? 0,
    downloads: raw.downloads ?? 0,
    views: raw.views ?? 0,
    commentCount: raw.commentCount ?? 0,
    allowComments: raw.allowComments ?? true,
    status: raw.status as "draft" | "published",
    publishedAt: raw.publishedAt ? new Date(raw.publishedAt).toISOString() : null,
    updatedAt: new Date(raw.updatedAt).toISOString(),
    seo: raw.seo
      ? {
          metaTitle: raw.seo.metaTitle ?? "",
          metaDescription: raw.seo.metaDescription ?? "",
          keywords: raw.seo.keywords ?? [],
          canonical: raw.seo.canonical ?? "",
          noindex: raw.seo.noindex ?? false,
        }
      : emptySeo,
  };
}

/** Sinh slug thân thiện SEO từ tiêu đề tiếng Việt ("Furina áo hoodie" -> "furina-ao-hoodie"). */
export function makeSlug(title: string): string {
  return slugify(title, { lower: true, strict: true, locale: "vi" });
}

function deviceQuery(device?: DeviceFilter) {
  if (!device) return {};
  return { deviceType: { $in: [device, "both"] } };
}

export type ListWallpapersParams = {
  categorySlug?: string;
  device?: DeviceFilter;
  mediaType?: "image" | "video";
  q?: string;
  /** relevance chỉ có nghĩa khi có q; mặc định: có q thì relevance, không thì newest. */
  sort?: SearchSort;
  page?: number;
  limit?: number;
};

export type SearchSort = "relevance" | "newest" | "likes";

export function parseSearchSort(value: unknown): SearchSort | undefined {
  return value === "relevance" || value === "newest" || value === "likes" ? value : undefined;
}

/** Số ứng viên tối đa khi chấm điểm liên quan — đủ cho kho vài nghìn ảnh. */
const MAX_SEARCH_CANDIDATES = 1000;

/**
 * Điểm liên quan của một hình nền với từ khoá (đã chuẩn hoá). Khớp tiêu đề nặng
 * ký nhất, rồi đến tag, còn lại (danh mục/mô tả) chỉ cộng ít.
 */
export function relevanceScore(
  doc: { title: string; tags?: string[] | null },
  query: string,
  tokens: string[]
): number {
  const title = normalizeSearch(doc.title);
  const tags = (doc.tags ?? []).map(normalizeSearch);
  let score = 0;
  if (title === query) score += 120;
  else if (title.startsWith(query)) score += 80;
  else if (title.includes(query)) score += 50;
  if (tags.includes(query)) score += 40;
  const titleWords = title.split(" ");
  for (const token of tokens) {
    if (titleWords.some((w) => w.startsWith(token))) score += 12;
    else if (title.includes(token)) score += 6;
    if (tags.some((t) => t.startsWith(token))) score += 5;
    score += 1; // khớp ở danh mục/mô tả (đã chắc chắn khớp đâu đó nhờ bộ lọc)
  }
  return score;
}

/** Bộ lọc Mongo cho từ khoá: mọi từ đều phải có một từ trong searchText bắt đầu bằng nó. */
export function searchFilter(q: string): Record<string, unknown> | null {
  const tokens = searchTokens(q);
  if (!tokens.length) return null;
  return { $and: tokens.map((t) => ({ searchText: { $regex: wordPrefixPattern(t) } })) };
}

type SearchCandidate = {
  _id: unknown;
  title: string;
  tags?: string[];
  likes?: number;
  publishedAt?: Date | null;
};

/** Tìm + chấm điểm + phân trang. Trả về id theo đúng thứ tự hiển thị. */
async function searchIds(
  filter: Record<string, unknown>,
  q: string,
  sort: SearchSort,
  page: number,
  limit: number
): Promise<{ ids: string[]; total: number }> {
  const query = normalizeSearch(q);
  const tokens = searchTokens(q);
  const candidates = await Wallpaper.find(filter)
    .select({ title: 1, tags: 1, likes: 1, publishedAt: 1 })
    .sort({ publishedAt: -1 })
    .limit(MAX_SEARCH_CANDIDATES)
    .lean<SearchCandidate[]>();

  const time = (d?: Date | null) => (d ? new Date(d).getTime() : 0);
  const ranked = candidates
    .map((c) => ({ c, score: relevanceScore(c, query, tokens) }))
    .sort((a, b) => {
      if (sort === "likes") return (b.c.likes ?? 0) - (a.c.likes ?? 0) || b.score - a.score;
      if (sort === "newest") return time(b.c.publishedAt) - time(a.c.publishedAt);
      return b.score - a.score || (b.c.likes ?? 0) - (a.c.likes ?? 0) || time(b.c.publishedAt) - time(a.c.publishedAt);
    });

  const start = (page - 1) * limit;
  return { ids: ranked.slice(start, start + limit).map((r) => String(r.c._id)), total: ranked.length };
}

/**
 * Đồng bộ lại searchText cho các hình nền khớp bộ lọc — gọi sau những lệnh
 * update không đi qua .save() (sửa hình nền, đổi tên danh mục...).
 */
export async function syncSearchText(filter: Record<string, unknown>): Promise<number> {
  const docs = await Wallpaper.find(filter)
    .select({ title: 1, tags: 1, categoryName: 1, description: 1, searchText: 1 })
    .lean<{ _id: unknown; title: string; tags?: string[]; categoryName?: string; description?: string; searchText?: string }[]>();
  const ops = docs
    .map((d) => ({ d, text: buildSearchText(d) }))
    .filter(({ d, text }) => d.searchText !== text)
    .map(({ d, text }) => ({ updateOne: { filter: { _id: String(d._id) }, update: { $set: { searchText: text } } } }));
  if (ops.length) await Wallpaper.bulkWrite(ops);
  return ops.length;
}

export type WallpaperListResult = {
  items: WallpaperView[];
  total: number;
  page: number;
  pageCount: number;
};

/** Danh sách hình nền cho trang chủ / trang category, có lọc thiết bị + tìm kiếm + phân trang. */
export const getWallpapers = cache(
  async (params: ListWallpapersParams = {}): Promise<WallpaperListResult> => {
    return withDb(async () => {
      const page = Math.max(1, params.page ?? 1);
      const limit = params.limit ?? (await getSettings()).wallpapers_per_page;

      const filter: Record<string, unknown> = {
        status: "published",
        ...deviceQuery(params.device),
      };
      if (params.categorySlug) {
        // Bao gồm cả danh mục con: xem "One Piece" phải thấy cả ảnh gắn "Luffy"
        filter.categorySlug = { $in: await getCategorySlugsWithChildren(params.categorySlug) };
      }
      if (params.mediaType) filter.mediaType = params.mediaType;

      const textFilter = params.q ? searchFilter(params.q) : null;
      if (textFilter) {
        const { ids, total } = await searchIds(
          { ...filter, ...textFilter },
          params.q!,
          params.sort ?? "relevance",
          page,
          limit
        );
        const docs = await Wallpaper.find({ _id: { $in: ids } }).lean();
        const byId = new Map(docs.map((d) => [String(d._id), d]));
        return {
          items: ids
            .map((id) => byId.get(id))
            .filter((d): d is NonNullable<typeof d> => Boolean(d))
            .map((d) => toWallpaperView(d as Record<string, unknown>)),
          total,
          page,
          pageCount: Math.max(1, Math.ceil(total / limit)),
        };
      }

      const sort: Record<string, 1 | -1> =
        params.sort === "likes" ? { likes: -1, publishedAt: -1 } : { publishedAt: -1 };

      const [docs, total] = await Promise.all([
        Wallpaper.find(filter)
          .sort(sort)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Wallpaper.countDocuments(filter),
      ]);

      return {
        items: docs.map((d) => toWallpaperView(d as Record<string, unknown>)),
        total,
        page,
        pageCount: Math.max(1, Math.ceil(total / limit)),
      };
    }, () => queryMockWallpapers(params));
  }
);

/** Danh sách "thịnh hành" cho trang /thinh-hanh — sắp theo lượt xem rồi lượt thích. */
export const getTrendingWallpapers = cache(
  async (params: Omit<ListWallpapersParams, "q"> = {}): Promise<WallpaperListResult> => {
    return withDb(async () => {
      const page = Math.max(1, params.page ?? 1);
      const limit = params.limit ?? (await getSettings()).wallpapers_per_page;

      const filter: Record<string, unknown> = {
        status: "published",
        ...deviceQuery(params.device),
      };
      if (params.categorySlug) {
        // Bao gồm cả danh mục con: xem "One Piece" phải thấy cả ảnh gắn "Luffy"
        filter.categorySlug = { $in: await getCategorySlugsWithChildren(params.categorySlug) };
      }
      if (params.mediaType) filter.mediaType = params.mediaType;

      const [docs, total] = await Promise.all([
        Wallpaper.find(filter)
          .sort({ views: -1, likes: -1, publishedAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Wallpaper.countDocuments(filter),
      ]);

      return {
        items: docs.map((d) => toWallpaperView(d as Record<string, unknown>)),
        total,
        page,
        pageCount: Math.max(1, Math.ceil(total / limit)),
      };
    }, () => queryMockTrendingWallpapers(params));
  }
);

export const getWallpaperBySlug = cache(
  async (slug: string): Promise<WallpaperView | null> => {
    return withDb(async () => {
      const doc = await Wallpaper.findOne({ slug, status: "published" }).lean();
      return doc ? toWallpaperView(doc as Record<string, unknown>) : null;
    }, () => getMockWallpaperBySlug(slug));
  }
);

/**
 * Đề xuất cho trang chi tiết: ưu tiên cùng chủ đề, thiếu thì bù bằng hình mới nhất
 * để cột "xem thêm" không bị trống với chủ đề ít ảnh.
 */
export const getMoreLikeThis = cache(
  async (categorySlug: string, excludeSlug: string, limit = 30): Promise<WallpaperView[]> => {
    const sameCategory = await getRelatedWallpapers(categorySlug, excludeSlug, limit);
    if (sameCategory.length >= limit) return sameCategory;

    const { items: latest } = await getWallpapers({ limit: limit + 1 });
    const seen = new Set([excludeSlug, ...sameCategory.map((w) => w.slug)]);
    return [...sameCategory, ...latest.filter((w) => !seen.has(w.slug))].slice(0, limit);
  }
);

export const getRelatedWallpapers = cache(
  async (categorySlug: string, excludeSlug: string, limit = 6): Promise<WallpaperView[]> => {
    return withDb(async () => {
      const docs = await Wallpaper.find({
        status: "published",
        categorySlug,
        slug: { $ne: excludeSlug },
      })
        .sort({ publishedAt: -1 })
        .limit(limit)
        .lean();
      return docs.map((d) => toWallpaperView(d as Record<string, unknown>));
    }, () => getMockRelatedWallpapers(categorySlug, excludeSlug, limit));
  }
);

/** Danh sách rút gọn cho sitemap: chỉ cần slug và ngày cập nhật. */
/**
 * Slug của những danh mục thực sự có hình nền đã xuất bản.
 *
 * Sitemap chỉ nên khai những URL có nội dung: trang danh mục rỗng là thin content,
 * Google đánh giá thấp cả site vì nó. Trả về slug lưu trên chính hình nền
 * (categorySlug), nên bên gọi phải tự cộng thêm slug của danh mục con khi xét
 * danh mục cha — cha hiện ảnh của con nên không rỗng.
 */
export const getCategorySlugsWithContent = cache(async (): Promise<Set<string>> => {
  return withDb(
    async () => {
      const slugs = await Wallpaper.distinct("categorySlug", { status: "published" });
      return new Set(slugs.filter((s): s is string => typeof s === "string" && s.length > 0));
    },
    () => new Set(queryMockWallpapers({ limit: 1000 }).items.map((w) => w.categorySlug))
  );
});

export async function getWallpapersForSitemap(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  return withDb(async () => {
    const docs = await Wallpaper.find({ status: "published" })
      .select({ slug: 1, updatedAt: 1 })
      .sort({ updatedAt: -1 })
      .limit(5000)
      .lean();

    return docs.map((d) => {
      const doc = d as unknown as { slug: string; updatedAt: Date };
      return { slug: doc.slug, updatedAt: doc.updatedAt };
    });
  }, () => getMockWallpapersForSitemap());
}

/** Tăng lượt xem — gọi khi render trang chi tiết, không cần chờ kết quả. */
export async function incrementViews(slug: string): Promise<void> {
  await withDb(async () => {
    await Wallpaper.updateOne({ slug }, { $inc: { views: 1 } });
  }, () => incrementMockViews(slug));
}

export async function incrementDownloads(slug: string): Promise<string | null> {
  return withDb(async () => {
    const doc = await Wallpaper.findOneAndUpdate(
      { slug, status: "published" },
      { $inc: { downloads: 1 } },
      { new: true, projection: { "media.url": 1 } }
    ).lean<{ media: { url: string } } | null>();
    return doc?.media.url ?? null;
  }, () => incrementMockDownloads(slug));
}

/** Lấy tất cả wallpapers để tính stats. */
export async function getAllWallpapers(): Promise<WallpaperView[]> {
  return withDb(async () => {
    const docs = await Wallpaper.find({ status: "published" })
      .sort({ publishedAt: -1 })
      .limit(10000)
      .lean();
    return docs.map((d) => toWallpaperView(d as Record<string, unknown>));
  }, () => {
    const result = queryMockWallpapers({ limit: 10000 });
    return result.items;
  });
}

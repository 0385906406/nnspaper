import "server-only";
import slugify from "slugify";
import type { CategoryView } from "@/lib/categories";
import type { CommentView } from "@/lib/comments";
import { buildSearchText, matchesAllTokens, searchTokens } from "@/lib/search-text";
import type {
  ListWallpapersParams,
  MediaView,
  WallpaperListResult,
  WallpaperView,
} from "@/lib/wallpapers";

/**
 * Dữ liệu ảo dùng khi chưa kết nối được MongoDB (dev local chưa cài DB).
 * Nội dung lấy từ scripts/seed.mjs để giao diện hiển thị giống hệt dữ liệu seed thật.
 */

const PAGE_SIZE = 8;
const emptySeo = { metaTitle: "", metaDescription: "", keywords: [] };

function slug(title: string): string {
  return slugify(title, { lower: true, strict: true, locale: "vi" });
}

function pcMedia(seed: string): MediaView {
  return {
    url: `https://picsum.photos/seed/${seed}/1920/1080`,
    publicId: `seed/${seed}`,
    resourceType: "image",
    width: 1920,
    height: 1080,
    format: "jpg",
    bytes: 3_200_000,
    alt: seed.replace(/-/g, " "),
    provider: "cloudinary",
  };
}

function phoneMedia(seed: string): MediaView {
  return {
    url: `https://picsum.photos/seed/${seed}/1080/1920`,
    publicId: `seed/${seed}`,
    resourceType: "image",
    width: 1080,
    height: 1920,
    format: "jpg",
    bytes: 2_600_000,
    alt: seed.replace(/-/g, " "),
    provider: "cloudinary",
  };
}

const CATEGORY_SOURCE: Omit<CategoryView, "id" | "seo" | "parentId">[] = [
  { name: "Anime", slug: "anime", icon: "🎌", order: 1, description: "Hình nền nhân vật và bối cảnh anime." },
  { name: "Game", slug: "game", icon: "🎮", order: 2, description: "Hình nền lấy cảm hứng từ các tựa game nổi tiếng." },
  { name: "Viễn tưởng", slug: "vien-tuong", icon: "🚀", order: 3, description: "Không gian, khoa học viễn tưởng, thế giới giả tưởng." },
  { name: "Dark / Creepy", slug: "dark-creepy", icon: "🌑", order: 4, description: "Hình nền tối màu, ma mị, huyền bí." },
  { name: "Phong cảnh", slug: "phong-canh", icon: "🏞️", order: 5, description: "Thiên nhiên, núi non, hoàng hôn, biển cả." },
  { name: "Phương tiện giao thông", slug: "phuong-tien", icon: "🚗", order: 6, description: "Xe hơi, mô tô, máy bay tốc độ cao." },
  { name: "Pixel", slug: "pixel", icon: "🕹️", order: 7, description: "Nghệ thuật pixel art hoài cổ." },
  { name: "Người", slug: "nguoi", icon: "🧑", order: 8, description: "Chân dung và nhân vật." },
  { name: "Thư giãn", slug: "thu-gian", icon: "🌿", order: 9, description: "Khung cảnh nhẹ nhàng, thư thái." },
];

export const mockCategories: CategoryView[] = CATEGORY_SOURCE.map((c, index) => ({
  ...c,
  // Dữ liệu ảo chỉ có danh mục cấp trên cùng
  parentId: null,
  id: `mock-category-${index + 1}`,
  seo: emptySeo,
}));

function categoryOf(categorySlug: string) {
  const category = mockCategories.find((c) => c.slug === categorySlug);
  if (!category) throw new Error(`mock-data: unknown category slug "${categorySlug}"`);
  return category;
}

type WallpaperSource = {
  title: string;
  categorySlug: string;
  deviceType: WallpaperView["deviceType"];
  mediaType: WallpaperView["mediaType"];
  resolutionLabel: string;
  tags: string[];
  source?: string;
  description: string;
  media: MediaView;
  thumbnail?: MediaView | null;
};

const WALLPAPER_SOURCE: WallpaperSource[] = [
  {
    title: "Furina áo hoodie dưới nắng graffiti",
    categorySlug: "anime",
    deviceType: "pc",
    mediaType: "image",
    resolutionLabel: "4K UHD",
    tags: ["anime", "genshin", "furina"],
    source: "Pinterest",
    description: "Cô gái anime mặc hoodie xanh pastel, vui vẻ giơ tay dưới bức tường graffiti rực rỡ.",
    media: pcMedia("furina-graffiti"),
  },
  {
    title: "Tử Đằng Nguyệt Ảnh",
    categorySlug: "phong-canh",
    deviceType: "pc",
    mediaType: "image",
    resolutionLabel: "4K UHD",
    tags: ["phong cảnh", "cổ trang", "thư giãn"],
    description: "Cây cầu đá bắc qua hồ nước tĩnh lặng dưới tán hoa tử đằng, ánh nắng sớm xuyên qua sương mù.",
    media: pcMedia("tu-dang-nguyet-anh"),
  },
  {
    title: "Columbina Genshin",
    categorySlug: "game",
    deviceType: "phone",
    mediaType: "image",
    resolutionLabel: "4K UHD",
    tags: ["genshin", "game", "columbina"],
    description: "Nhân vật Columbina trong trang phục lộng lẫy giữa nền trời đêm đầy sao.",
    media: phoneMedia("columbina-genshin"),
  },
  {
    title: "Celestial Dream Concert",
    categorySlug: "game",
    deviceType: "pc",
    mediaType: "image",
    resolutionLabel: "4K UHD",
    tags: ["concert", "game", "âm nhạc"],
    description: "Sân khấu concert lung linh ánh đèn neon tím xanh giữa không gian huyền ảo.",
    media: pcMedia("celestial-dream-concert"),
  },
  {
    title: "Hình nền động cánh cổng Torii",
    categorySlug: "phong-canh",
    deviceType: "both",
    mediaType: "video",
    resolutionLabel: "4K UHD",
    tags: ["nhật bản", "torii", "hoàng hôn"],
    description: "Cổng Torii đỏ nổi bật giữa hoàng hôn hồng tím, núi Phú Sĩ phía xa — video lặp mượt mà.",
    media: {
      url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      publicId: "seed/torii-gate-live",
      resourceType: "video",
      width: 1920,
      height: 1080,
      format: "mp4",
      duration: 10,
      bytes: 4_200_000,
      alt: "Video nền cổng Torii lúc hoàng hôn",
      provider: "cloudinary",
    },
    thumbnail: pcMedia("torii-gate-thumb"),
  },
  {
    title: "Columbina Genshin Impact",
    categorySlug: "anime",
    deviceType: "pc",
    mediaType: "image",
    resolutionLabel: "4K UHD",
    tags: ["anime", "game", "người"],
    description: "Mái tóc dài bay trong gió đêm, ánh trăng bạc phản chiếu trên trang phục cổ trang.",
    media: pcMedia("columbina-impact"),
  },
  {
    title: "Phi thuyền xuyên không gian",
    categorySlug: "vien-tuong",
    deviceType: "pc",
    mediaType: "image",
    resolutionLabel: "4K UHD",
    tags: ["không gian", "phi thuyền", "viễn tưởng"],
    description: "Phi thuyền lướt qua dải ngân hà rực rỡ ánh sao.",
    media: pcMedia("spaceship-galaxy"),
  },
  {
    title: "Rừng ma ám dưới trăng máu",
    categorySlug: "dark-creepy",
    deviceType: "phone",
    mediaType: "image",
    resolutionLabel: "2K",
    tags: ["dark", "creepy", "trăng máu"],
    description: "Khu rừng chết chóc dưới ánh trăng đỏ, sương mù bao phủ lối đi.",
    media: phoneMedia("blood-moon-forest"),
  },
  {
    title: "Siêu xe dưới ánh đèn neon",
    categorySlug: "phuong-tien",
    deviceType: "pc",
    mediaType: "image",
    resolutionLabel: "4K UHD",
    tags: ["xe hơi", "neon", "tốc độ"],
    description: "Siêu xe thể thao lướt qua thành phố về đêm với vệt đèn neon dài.",
    media: pcMedia("neon-supercar"),
  },
  {
    title: "Thành phố pixel art hoài cổ",
    categorySlug: "pixel",
    deviceType: "both",
    mediaType: "image",
    resolutionLabel: "FHD",
    tags: ["pixel", "retro", "thành phố"],
    description: "Thành phố về đêm theo phong cách pixel art 16-bit đầy hoài niệm.",
    media: pcMedia("pixel-city"),
  },
  {
    title: "Chân dung cô gái giữa hoa anh đào",
    categorySlug: "nguoi",
    deviceType: "phone",
    mediaType: "image",
    resolutionLabel: "4K UHD",
    tags: ["chân dung", "hoa anh đào", "mùa xuân"],
    description: "Chân dung nhẹ nhàng giữa những cánh hoa anh đào rơi.",
    media: phoneMedia("sakura-portrait"),
  },
  {
    title: "Buổi chiều thư giãn bên hồ",
    categorySlug: "thu-gian",
    deviceType: "pc",
    mediaType: "image",
    resolutionLabel: "2K",
    tags: ["thư giãn", "hồ nước", "chiều tà"],
    description: "Băng ghế gỗ bên hồ nước phẳng lặng lúc chiều tà, không khí yên bình.",
    media: pcMedia("lakeside-relax"),
  },
];

function buildMockWallpapers(): WallpaperView[] {
  const now = Date.now();
  return WALLPAPER_SOURCE.map((w, index) => {
    const category = categoryOf(w.categorySlug);
    const publishedAt = new Date(now - index * 3_600_000).toISOString();
    return {
      id: `mock-wallpaper-${index + 1}`,
      title: w.title,
      slug: slug(w.title),
      description: w.description,
      categoryName: category.name,
      categorySlug: category.slug,
      deviceType: w.deviceType,
      mediaType: w.mediaType,
      media: w.media,
      thumbnail: w.thumbnail ?? null,
      resolutionLabel: w.resolutionLabel,
      tags: w.tags,
      source: w.source ?? "",
      likes: 0,
      dislikes: 0,
      downloads: 0,
      views: 0,
      commentCount: 0,
      allowComments: true,
      status: "published" as const,
      publishedAt,
      updatedAt: publishedAt,
      seo: { metaTitle: "", metaDescription: "", keywords: [], canonical: "", noindex: false },
    };
  });
}

declare global {
  var _mockWallpapers: WallpaperView[] | undefined;
  var _mockFavorites: Map<string, Set<string>> | undefined;
  var _mockLikes: Map<string, Set<string>> | undefined;
  var _mockComments: CommentView[] | undefined;
}

/**
 * Mảng có thể mutate được (like/dislike/download/view) — cache trên `globalThis` vì Next.js dev
 * (Turbopack) khởi tạo module này riêng biệt cho Route Handler và cho Page/Server Component,
 * nên biến module-level thường sẽ KHÔNG dùng chung giữa hai phía. `globalThis` là nơi duy nhất
 * chắc chắn sống sót và được chia sẻ qua các lần khởi tạo module đó (giống cách mongodb.ts cache
 * kết nối Mongoose qua hot-reload).
 */
export const mockWallpapers: WallpaperView[] =
  globalThis._mockWallpapers ?? (globalThis._mockWallpapers = buildMockWallpapers());

export function getMockCategories(): CategoryView[] {
  return [...mockCategories].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export function getMockCategoryBySlug(categorySlug: string): CategoryView | null {
  return mockCategories.find((c) => c.slug === categorySlug) ?? null;
}

export function queryMockWallpapers(params: ListWallpapersParams = {}): WallpaperListResult {
  const page = Math.max(1, params.page ?? 1);
  const limit = params.limit ?? PAGE_SIZE;

  let items = mockWallpapers.filter((w) => w.status === "published");
  if (params.device) {
    items = items.filter((w) => w.deviceType === params.device || w.deviceType === "both");
  }
  if (params.categorySlug) {
    items = items.filter((w) => w.categorySlug === params.categorySlug);
  }
  if (params.mediaType) {
    items = items.filter((w) => w.mediaType === params.mediaType);
  }
  if (params.q) {
    const tokens = searchTokens(params.q);
    items = items.filter((w) => matchesAllTokens(buildSearchText(w), tokens));
  }

  items = [...items].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));

  const total = items.length;
  const start = (page - 1) * limit;

  return {
    items: items.slice(start, start + limit),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / limit)),
  };
}

export function queryMockTrendingWallpapers(
  params: Omit<ListWallpapersParams, "q"> = {}
): WallpaperListResult {
  const page = Math.max(1, params.page ?? 1);
  const limit = params.limit ?? PAGE_SIZE;

  let items = mockWallpapers.filter((w) => w.status === "published");
  if (params.device) {
    items = items.filter((w) => w.deviceType === params.device || w.deviceType === "both");
  }
  if (params.categorySlug) {
    items = items.filter((w) => w.categorySlug === params.categorySlug);
  }
  if (params.mediaType) {
    items = items.filter((w) => w.mediaType === params.mediaType);
  }

  items = [...items].sort(
    (a, b) => b.views - a.views || b.likes - a.likes || (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")
  );

  const total = items.length;
  const start = (page - 1) * limit;

  return {
    items: items.slice(start, start + limit),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / limit)),
  };
}

export function getMockWallpaperBySlug(wallpaperSlug: string): WallpaperView | null {
  return mockWallpapers.find((w) => w.slug === wallpaperSlug && w.status === "published") ?? null;
}

export function getMockRelatedWallpapers(
  categorySlug: string,
  excludeSlug: string,
  limit = 6
): WallpaperView[] {
  return mockWallpapers
    .filter((w) => w.status === "published" && w.categorySlug === categorySlug && w.slug !== excludeSlug)
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, limit);
}

export function getMockWallpapersForSitemap(): { slug: string; updatedAt: Date }[] {
  return mockWallpapers
    .filter((w) => w.status === "published")
    .map((w) => ({ slug: w.slug, updatedAt: new Date(w.updatedAt) }));
}

export function incrementMockViews(wallpaperSlug: string): void {
  const wallpaper = mockWallpapers.find((w) => w.slug === wallpaperSlug);
  if (wallpaper) wallpaper.views += 1;
}

/** Kho "thả tim" ảo: slug -> tập userId đã tim. */
const mockLikes: Map<string, Set<string>> = globalThis._mockLikes ?? (globalThis._mockLikes = new Map());

export function hasMockLiked(userId: string, wallpaperSlug: string): boolean {
  return mockLikes.get(wallpaperSlug)?.has(userId) ?? false;
}

export function toggleMockLike(
  userId: string,
  wallpaperSlug: string
): { liked: boolean; likes: number } | null {
  const wallpaper = mockWallpapers.find((w) => w.slug === wallpaperSlug && w.status === "published");
  if (!wallpaper) return null;
  let set = mockLikes.get(wallpaperSlug);
  if (!set) {
    set = new Set();
    mockLikes.set(wallpaperSlug, set);
  }
  const liked = !set.has(userId);
  if (liked) set.add(userId);
  else set.delete(userId);
  wallpaper.likes = Math.max(0, wallpaper.likes + (liked ? 1 : -1));
  return { liked, likes: wallpaper.likes };
}

/** Bình luận ảo — chỉ sống trong bộ nhớ tiến trình dev, mất khi khởi động lại. */
const mockComments: CommentView[] = globalThis._mockComments ?? (globalThis._mockComments = []);

export function getMockComments(wallpaperSlug: string): CommentView[] {
  return mockComments.filter((c) => c.wallpaperSlug === wallpaperSlug);
}

export function addMockComment(comment: Omit<CommentView, "id" | "createdAt">): CommentView {
  const created: CommentView = {
    ...comment,
    id: `mock-comment-${Date.now()}-${mockComments.length}`,
    createdAt: new Date().toISOString(),
  };
  mockComments.unshift(created);
  const wallpaper = mockWallpapers.find((w) => w.slug === comment.wallpaperSlug);
  if (wallpaper) wallpaper.commentCount += 1;
  return created;
}

export function findMockComment(id: string): CommentView | null {
  return mockComments.find((c) => c.id === id) ?? null;
}

export function removeMockComment(id: string): CommentView | null {
  const index = mockComments.findIndex((c) => c.id === id);
  if (index < 0) return null;
  const [removed] = mockComments.splice(index, 1);
  const wallpaper = mockWallpapers.find((w) => w.slug === removed.wallpaperSlug);
  if (wallpaper) wallpaper.commentCount = Math.max(0, wallpaper.commentCount - 1);
  return removed;
}

/** Kho "yêu thích" ảo — cache trên `globalThis` với lý do tương tự mockWallpapers ở trên. */
const mockFavorites: Map<string, Set<string>> =
  globalThis._mockFavorites ?? (globalThis._mockFavorites = new Map());

function favoritesOf(userId: string): Set<string> {
  let set = mockFavorites.get(userId);
  if (!set) {
    set = new Set();
    mockFavorites.set(userId, set);
  }
  return set;
}

export function isMockFavorited(userId: string, wallpaperSlug: string): boolean {
  return mockFavorites.get(userId)?.has(wallpaperSlug) ?? false;
}

export function toggleMockFavorite(userId: string, wallpaperSlug: string): boolean {
  const set = favoritesOf(userId);
  if (set.has(wallpaperSlug)) {
    set.delete(wallpaperSlug);
    return false;
  }
  set.add(wallpaperSlug);
  return true;
}

export function getMockFavoriteWallpapers(userId: string): WallpaperView[] {
  const slugs = mockFavorites.get(userId);
  if (!slugs?.size) return [];
  return mockWallpapers.filter((w) => w.status === "published" && slugs.has(w.slug));
}

export function incrementMockDownloads(wallpaperSlug: string): string | null {
  const wallpaper = mockWallpapers.find((w) => w.slug === wallpaperSlug && w.status === "published");
  if (!wallpaper) return null;
  wallpaper.downloads += 1;
  return wallpaper.media.url;
}

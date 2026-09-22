import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { getCategories } from "@/lib/categories";
import {
  getCategorySlugsWithContent,
  getWallpapersForSitemap,
  SITEMAP_URL_LIMIT,
} from "@/lib/wallpapers";

// Danh mục/hình nền thay đổi thường xuyên và cần kết nối DB — không thể build tĩnh lúc build time.
export const dynamic = "force-dynamic";

// Trang danh sách cố định (không phụ thuộc danh mục/slug động).
const LISTING_PAGES = [
  { path: "/thinh-hanh", priority: 0.8 },
  { path: "/hinh-nen-dong", priority: 0.8 },
  { path: "/hinh-nen-may-tinh", priority: 0.8 },
  { path: "/hinh-nen-dien-thoai", priority: 0.8 },
];

// Trang nội dung tĩnh (giới thiệu, chính sách...).
const STATIC_PAGES = [
  { path: "/gioi-thieu", priority: 0.4 },
  { path: "/lien-he", priority: 0.4 },
  { path: "/cau-hoi-thuong-gap", priority: 0.4 },
  { path: "/chinh-sach-bao-mat", priority: 0.3 },
  { path: "/dieu-khoan-su-dung", priority: 0.3 },
  { path: "/mien-tru-trach-nhiem", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, wallpapers, slugsWithContent] = await Promise.all([
    getCategories(),
    getWallpapersForSitemap(),
    getCategorySlugsWithContent(),
  ]);

  // Chỉ khai danh mục có nội dung. Danh mục cha hiện cả ảnh của danh mục con
  // (xem getCategorySlugsWithChildren), nên cha có con còn ảnh thì vẫn tính là có
  // nội dung dù bản thân nó không được gán ảnh nào.
  const childrenOf = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const siblings = childrenOf.get(category.parentId) ?? [];
    siblings.push(category.slug);
    childrenOf.set(category.parentId, siblings);
  }

  const publishableCategories = categories.filter(
    (category) =>
      slugsWithContent.has(category.slug) ||
      (childrenOf.get(category.id) ?? []).some((slug) => slugsWithContent.has(slug))
  );

  // getWallpapersForSitemap sắp xếp theo updatedAt giảm dần, nên phần tử đầu là
  // lần cập nhật gần nhất của cả kho. Trang chủ và các trang danh sách đều đổi
  // nội dung mỗi khi có ảnh mới, nên dùng chung mốc này làm <lastmod>. Thiếu
  // <lastmod>, Google phải tự đoán tần suất và thường bò lại chậm hơn nhiều.
  const latestUpdate = wallpapers[0]?.updatedAt ?? new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: latestUpdate, changeFrequency: "daily", priority: 1 },
    ...LISTING_PAGES.map((page) => ({
      url: absoluteUrl(page.path),
      lastModified: latestUpdate,
      changeFrequency: "daily" as const,
      priority: page.priority,
    })),
    ...publishableCategories.map((category) => ({
      url: absoluteUrl(`/danh-muc/${category.slug}`),
      lastModified: latestUpdate,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...STATIC_PAGES.map((page) => ({
      url: absoluteUrl(page.path),
      changeFrequency: "monthly" as const,
      priority: page.priority,
    })),
    ...wallpapers.map((wallpaper) => {
      const cover = wallpaper.mediaType === "video" ? wallpaper.thumbnailUrl : wallpaper.mediaUrl;

      return {
        url: absoluteUrl(`/hinh-nen/${wallpaper.slug}`),
        lastModified: wallpaper.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
        images: cover ? [cover] : undefined,
        // Video sitemap: đây là cách duy nhất để video nền lọt vào tab Video của
        // Google. title/thumbnail_loc/description đều là trường bắt buộc, thiếu
        // một trường là Google bỏ qua cả mục.
        ...(wallpaper.mediaType === "video" && cover
          ? {
              videos: [
                {
                  title: wallpaper.title,
                  thumbnail_loc: cover,
                  description: wallpaper.description || wallpaper.title,
                  content_loc: wallpaper.mediaUrl || undefined,
                  player_loc: absoluteUrl(`/hinh-nen/${wallpaper.slug}`),
                },
              ],
            }
          : {}),
      };
    }),
  ];

  return entries.slice(0, SITEMAP_URL_LIMIT);
}

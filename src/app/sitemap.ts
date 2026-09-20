import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { getCategories } from "@/lib/categories";
import { getCategorySlugsWithContent, getWallpapersForSitemap } from "@/lib/wallpapers";

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

  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    ...LISTING_PAGES.map((page) => ({
      url: absoluteUrl(page.path),
      changeFrequency: "daily" as const,
      priority: page.priority,
    })),
    ...publishableCategories.map((category) => ({
      url: absoluteUrl(`/danh-muc/${category.slug}`),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...STATIC_PAGES.map((page) => ({
      url: absoluteUrl(page.path),
      changeFrequency: "monthly" as const,
      priority: page.priority,
    })),
    ...wallpapers.map((wallpaper) => ({
      url: absoluteUrl(`/hinh-nen/${wallpaper.slug}`),
      lastModified: wallpaper.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}

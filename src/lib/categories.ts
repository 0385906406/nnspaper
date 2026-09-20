import "server-only";
import { cache } from "react";
import { withDb } from "@/lib/data-source";
import { Category, type CategoryDoc } from "@/models/Category";
import { getMockCategories, getMockCategoryBySlug } from "@/lib/mock-data";

import {
  buildCategoryTree,
  type CategoryNode,
  type CategorySeo,
  type CategoryView,
} from "@/lib/category-tree";

export { buildCategoryTree };
export type { CategoryNode, CategorySeo, CategoryView };

const emptySeo: CategorySeo = { metaTitle: "", metaDescription: "", keywords: [] };

export function toCategoryView(doc: Record<string, unknown>): CategoryView {
  const raw = doc as never as CategoryDoc & { _id: { toString(): string } };
  return {
    id: String(raw._id),
    name: raw.name,
    slug: raw.slug,
    description: raw.description ?? "",
    icon: raw.icon ?? "",
    order: raw.order ?? 0,
    parentId: raw.parentId ? String(raw.parentId) : null,
    seo: raw.seo
      ? {
          metaTitle: raw.seo.metaTitle ?? "",
          metaDescription: raw.seo.metaDescription ?? "",
          keywords: raw.seo.keywords ?? [],
        }
      : emptySeo,
  };
}

/** `cache()` gộp các lần gọi trùng nhau trong cùng một request (sidebar + metadata). */
export const getCategories = cache(async (): Promise<CategoryView[]> => {
  return withDb(async () => {
    const docs = await Category.find({}).sort({ order: 1, name: 1 }).lean();
    return docs.map((d) => toCategoryView(d as Record<string, unknown>));
  }, () => getMockCategories());
});

export const getCategoryBySlug = cache(
  async (slug: string): Promise<CategoryView | null> => {
    return withDb(async () => {
      const doc = await Category.findOne({ slug }).lean();
      return doc ? toCategoryView(doc as Record<string, unknown>) : null;
    }, () => getMockCategoryBySlug(slug));
  }
);

export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  return buildCategoryTree(await getCategories());
});

/**
 * Slug của một danh mục cộng slug của tất cả danh mục con.
 *
 * Hình nền gán vào "Luffy" vẫn phải hiện khi khách xem "One Piece", nên trang
 * danh mục cha phải lọc theo cả cụm slug chứ không riêng slug của nó.
 */
export const getCategorySlugsWithChildren = cache(async (slug: string): Promise<string[]> => {
  const all = await getCategories();
  const target = all.find((c) => c.slug === slug);
  if (!target) return [slug];

  const children = all.filter((c) => c.parentId === target.id).map((c) => c.slug);
  return [target.slug, ...children];
});

/** Đường dẫn cha → con để dựng breadcrumb trên trang danh mục. */
export const getCategoryTrail = cache(async (slug: string): Promise<CategoryView[]> => {
  const all = await getCategories();
  const target = all.find((c) => c.slug === slug);
  if (!target) return [];

  const parent = target.parentId ? all.find((c) => c.id === target.parentId) : undefined;
  return parent ? [parent, target] : [target];
});

/**
 * Kiểu dữ liệu và hàm thuần cho cây danh mục.
 *
 * Tách khỏi `lib/categories.ts` vì file đó có `import "server-only"` (nó truy
 * vấn MongoDB), mà thanh danh mục ở đầu trang là Client Component — import
 * nhầm sang đó là vỡ toàn bộ ứng dụng.
 */

export type CategorySeo = { metaTitle: string; metaDescription: string; keywords: string[] };

export type CategoryView = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  order: number;
  /** null = danh mục cấp trên cùng. */
  parentId: string | null;
  seo: CategorySeo;
};

/** Danh mục cha kèm danh sách con, dùng cho thanh chủ đề và trang danh mục. */
export type CategoryNode = CategoryView & { children: CategoryView[] };

/** Gom danh sách phẳng thành cây cha → con, giữ nguyên thứ tự `order`. */
export function buildCategoryTree(categories: CategoryView[]): CategoryNode[] {
  const roots = categories.filter((c) => !c.parentId);
  return roots.map((root) => ({
    ...root,
    children: categories.filter((c) => c.parentId === root.id),
  }));
}

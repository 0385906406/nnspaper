import { getCategories } from "@/lib/categories";

/** GET /api/categories — danh sách category cho sidebar/filter. Tạo/sửa danh mục đi qua /api/admin/categories. */
export async function GET() {
  const categories = await getCategories();
  return Response.json({ categories });
}

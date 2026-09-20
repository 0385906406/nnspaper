import { getWallpapers, parseSearchSort, type DeviceFilter } from "@/lib/wallpapers";

function parseDevice(value: string | null): DeviceFilter | undefined {
  return value === "pc" || value === "phone" ? value : undefined;
}

function parseType(value: string | null): "image" | "video" | undefined {
  return value === "image" || value === "video" ? value : undefined;
}

/**
 * GET /api/wallpapers?category=&device=pc|phone&type=image|video&q=&sort=relevance|newest|likes&page=
 * Dùng cho lưới cuộn vô hạn. Tạo/sửa/xoá hình nền đi qua /api/admin/wallpapers
 * (kiểm tra đăng nhập + quyền, ghi audit log, dọn tương tác).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await getWallpapers({
    categorySlug: url.searchParams.get("category") ?? undefined,
    device: parseDevice(url.searchParams.get("device")),
    mediaType: parseType(url.searchParams.get("type")),
    q: url.searchParams.get("q")?.slice(0, 100) || undefined,
    sort: parseSearchSort(url.searchParams.get("sort")),
    page: Math.min(1000, Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1)),
  });

  return Response.json(result);
}

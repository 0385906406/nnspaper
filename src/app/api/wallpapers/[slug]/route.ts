import { getWallpaperBySlug } from "@/lib/wallpapers";

/** GET /api/wallpapers/[slug] — chi tiết một hình nền đã xuất bản. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/wallpapers/[slug]">
) {
  const { slug } = await params;
  const wallpaper = await getWallpaperBySlug(slug);
  if (!wallpaper) return Response.json({ error: "Không tìm thấy hình nền" }, { status: 404 });
  return Response.json({ wallpaper });
}

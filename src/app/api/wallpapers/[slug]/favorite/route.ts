import { auth } from "@/auth";
import { getWallpaperBySlug } from "@/lib/wallpapers";
import { toggleFavorite } from "@/lib/favorites";

/** POST /api/wallpapers/[slug]/favorite — bật/tắt yêu thích, yêu cầu đã đăng nhập. */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/wallpapers/[slug]/favorite">
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Cần đăng nhập để dùng tính năng yêu thích" }, { status: 401 });
  }

  const { slug } = await params;
  const wallpaper = await getWallpaperBySlug(slug);
  if (!wallpaper) return Response.json({ error: "Không tìm thấy hình nền" }, { status: 404 });

  const favorited = await toggleFavorite(session.user.id, slug);
  return Response.json({ favorited });
}

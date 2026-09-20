import { auth } from "@/auth";
import { toggleLike } from "@/lib/likes";

/** POST /api/wallpapers/[slug]/like — thả tim / bỏ tim, yêu cầu đã đăng nhập. */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/wallpapers/[slug]/like">
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Cần đăng nhập để thả tim" }, { status: 401 });
  }

  const { slug } = await params;
  const result = await toggleLike(session.user.id, slug);
  if (!result) return Response.json({ error: "Không tìm thấy hình nền" }, { status: 404 });

  return Response.json(result);
}

import { z } from "zod";
import { getCurrentUser } from "@/lib/admin";
import { getWallpaperBySlug } from "@/lib/wallpapers";
import { getSettings } from "@/lib/settings";
import { addComment, getComments, COMMENT_MAX_LENGTH } from "@/lib/comments";

export const runtime = "nodejs";

const bodySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Bình luận không được để trống")
    .max(COMMENT_MAX_LENGTH, `Bình luận tối đa ${COMMENT_MAX_LENGTH} ký tự`),
});

/** GET /api/wallpapers/[slug]/comments — bình luận đang hiển thị, công khai. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/wallpapers/[slug]/comments">
) {
  const { slug } = await params;
  const wallpaper = await getWallpaperBySlug(slug);
  if (!wallpaper) return Response.json({ error: "Không tìm thấy hình nền" }, { status: 404 });

  const comments = await getComments(slug);
  return Response.json({ comments, total: wallpaper.commentCount });
}

/** POST /api/wallpapers/[slug]/comments — thêm bình luận, yêu cầu tài khoản đang hoạt động. */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/wallpapers/[slug]/comments">
) {
  // Đọc user từ DB (không tin JWT) để tài khoản vừa bị khoá không bình luận tiếp được
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return Response.json({ error: "Cần đăng nhập để bình luận" }, { status: 401 });
  }

  const { slug } = await params;
  const [wallpaper, settings] = await Promise.all([getWallpaperBySlug(slug), getSettings()]);
  if (!wallpaper) return Response.json({ error: "Không tìm thấy hình nền" }, { status: 404 });
  if (!settings.comments_enabled || !wallpaper.allowComments) {
    return Response.json({ error: "Đã tắt nhận xét cho hình nền này" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Nội dung không hợp lệ" },
      { status: 400 }
    );
  }

  const result = await addComment({
    wallpaperSlug: slug,
    wallpaperTitle: wallpaper.title,
    userId: String(user._id),
    userName: user.name || user.email?.split("@")[0] || "Người dùng",
    userMascot: user.mascot,
    content: parsed.data.content,
  });

  if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result, { status: 201 });
}

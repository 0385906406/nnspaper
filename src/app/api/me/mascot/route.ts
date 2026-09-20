import { getCurrentUser } from "@/lib/admin";
import { isKnownMascot } from "@/lib/custom-mascots";

export const runtime = "nodejs";

/** PUT /api/me/mascot — lưu nhân vật người dùng chọn ({ mascot: slug | "none" }). Cần đăng nhập. */
export async function PUT(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return Response.json({ error: "Cần đăng nhập để chọn nhân vật" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { mascot?: unknown } | null;
  const mascot = typeof body?.mascot === "string" ? body.mascot : "";
  // Tra cả DB: nhân vật tuỳ chỉnh không có trong danh sách khai cứng, còn slug
  // bịa ra thì phải bị chặn ở đây chứ không được lưu vào tài khoản
  if (!(await isKnownMascot(mascot))) {
    return Response.json({ error: "Nhân vật không hợp lệ" }, { status: 400 });
  }

  user.mascot = mascot;
  await user.save();
  return Response.json({ mascot: user.mascot });
}

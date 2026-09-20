import { getCurrentUser } from "@/lib/admin";
import { isMascotChoice } from "@/lib/mascots";

export const runtime = "nodejs";

/** PUT /api/me/mascot — lưu nhân vật người dùng chọn ({ mascot: slug | "none" }). Cần đăng nhập. */
export async function PUT(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return Response.json({ error: "Cần đăng nhập để chọn nhân vật" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { mascot?: unknown } | null;
  const mascot = body?.mascot;
  if (!isMascotChoice(mascot)) {
    return Response.json({ error: "Nhân vật không hợp lệ" }, { status: 400 });
  }

  user.mascot = mascot;
  await user.save();
  return Response.json({ mascot: user.mascot });
}

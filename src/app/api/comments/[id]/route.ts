import { auth } from "@/auth";
import { hasPermission } from "@/lib/admin";
import { deleteComment } from "@/lib/comments";

export const runtime = "nodejs";

/** DELETE /api/comments/[id] — người viết tự xoá, hoặc người có quyền `comment.delete`. */
export async function DELETE(_request: Request, { params }: RouteContext<"/api/comments/[id]">) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Cần đăng nhập" }, { status: 401 });
  }

  const { id } = await params;
  const canModerate = await hasPermission("comment.delete").catch(() => false);
  const result = await deleteComment(id, { userId: session.user.id, canModerate });

  if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ ok: true });
}

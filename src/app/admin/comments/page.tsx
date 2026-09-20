import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/admin";
import { CommentsManager } from "@/components/admin/comments-manager";

export const metadata = { title: "Bình luận" };

export default async function AdminCommentsPage({ searchParams }: PageProps<"/admin/comments">) {
  const [canView, canEdit, canDelete] = await Promise.all([
    hasPermission("comment.view"),
    hasPermission("comment.edit"),
    hasPermission("comment.delete"),
  ]);
  if (!canView) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  const wallpaper = typeof sp.wallpaper === "string" ? sp.wallpaper : "";
  const user = typeof sp.user === "string" ? sp.user : "";

  return (
    <CommentsManager
      initialWallpaper={wallpaper}
      initialUser={user}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}

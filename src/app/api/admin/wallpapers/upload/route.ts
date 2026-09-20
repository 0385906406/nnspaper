import { auth } from "@/auth";
import { hasPermission } from "@/lib/admin";
import { destroyUnusedAsset } from "@/lib/cloudinary-assets";
import { connectDB } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * DELETE /api/admin/wallpapers/upload?publicId=&type=image|video — huỷ file vừa tải
 * lên nhưng không được lưu (admin đổi file khác, bấm Huỷ hoặc rời trang). Chỉ xoá
 * file trong thư mục hình nền mà chưa hình nền nào dùng.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await hasPermission("wallpaper.create"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const publicId = req.nextUrl.searchParams.get("publicId") ?? "";
    const type = req.nextUrl.searchParams.get("type") === "video" ? "video" : "image";
    if (!publicId) return NextResponse.json({ error: "Thiếu publicId." }, { status: 400 });

    await connectDB();
    const removed = await destroyUnusedAsset(publicId, type);
    return NextResponse.json({ removed });
  } catch (error) {
    console.error("Discard upload error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

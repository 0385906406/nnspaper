import { NextResponse } from "next/server";
import { customMascotSheet } from "@/lib/custom-mascots";

export const runtime = "nodejs";

/**
 * Chuyển hướng tới sprite thật của một nhân vật tuỳ chỉnh trên Cloudinary.
 *
 * Nhờ lớp trung gian này mà `mascotSheets(slug)` vẫn là hàm đồng bộ dùng được ở
 * client: đường dẫn chỉ cần slug, còn việc tra URL thật diễn ra ở đây. Không có
 * nó thì mọi component đang nhận vào một slug sẽ phải nhận cả bản ghi nhân vật.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; sheet: string }> }
) {
  const { slug, sheet } = await params;
  if (sheet !== "directions" && sheet !== "reactions") {
    return NextResponse.json({ error: "Sheet không hợp lệ." }, { status: 400 });
  }

  const url = await customMascotSheet(slug, sheet);
  if (!url) return NextResponse.json({ error: "Không tìm thấy nhân vật." }, { status: 404 });

  // 307 giữ nguyên phương thức và không bị trình duyệt cache vĩnh viễn như 301 —
  // admin thay sprite thì lần tải sau đã ra ảnh mới.
  return NextResponse.redirect(url, {
    status: 307,
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}

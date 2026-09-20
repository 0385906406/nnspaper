import { auth } from "@/auth";
import { hasPermission } from "@/lib/admin";
import { isR2Configured, presignVideoUpload } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Cấp URL đã ký để trình duyệt PUT video thẳng lên Cloudflare R2.
 *
 * Trả 503 khi chưa cấu hình R2 — client hiểu đó là tín hiệu quay về dùng
 * Cloudinary, nên dự án vẫn đăng được video bình thường trước khi ai kịp tạo
 * bucket và điền khoá.
 */
/** Cho form biết video sẽ vào R2 hay vẫn dùng Cloudinary, để hiện đúng trần dung lượng. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ enabled: isR2Configured() });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await hasPermission("wallpaper.create"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isR2Configured()) {
      return NextResponse.json({ error: "R2 chưa được cấu hình." }, { status: 503 });
    }

    const { fileName, contentType } = await req.json();
    if (typeof contentType !== "string" || !contentType.startsWith("video/")) {
      return NextResponse.json({ error: "R2 chỉ dùng cho video." }, { status: 400 });
    }

    const signed = await presignVideoUpload(
      typeof fileName === "string" ? fileName : "video.mp4",
      contentType
    );
    return NextResponse.json(signed);
  } catch (error) {
    console.error("R2 sign error:", error);
    return NextResponse.json({ error: "Không tạo được URL tải lên R2." }, { status: 500 });
  }
}

import { auth } from "@/auth";
import { hasPermission } from "@/lib/admin";
import { signUploadParams } from "@/lib/cloudinary";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Cấp chữ ký để trình duyệt tự tải file thẳng lên Cloudinary.
 *
 * Trước đây file đi qua route Next.js rồi mới sang Cloudinary. Cách đó chết trên
 * Vercel: serverless function chỉ nhận request body tối đa 4.5MB, nên mọi video
 * thực tế đều bị chặn ở tầng hạ tầng (413) trước khi chạm tới code, dù route khai
 * cho phép tới 100MB. Đi thẳng lên Cloudinary thì không còn trần 4.5MB lẫn giới
 * hạn thời gian chạy của function.
 *
 * API secret không bao giờ rời máy chủ — client chỉ nhận chữ ký đã tính sẵn, và
 * chữ ký khoá cứng thư mục đích nên không dùng để tải lên chỗ khác được.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await hasPermission("wallpaper.create"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { resourceType } = await req.json().catch(() => ({ resourceType: "image" }));
    return NextResponse.json(signUploadParams(resourceType === "video"));
  } catch (error) {
    console.error("Sign upload error:", error);
    return NextResponse.json(
      { error: "Chưa cấu hình Cloudinary. Kiểm tra biến CLOUDINARY_* trên máy chủ." },
      { status: 500 }
    );
  }
}

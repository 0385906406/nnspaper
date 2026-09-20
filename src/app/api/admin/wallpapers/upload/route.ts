import { auth } from "@/auth";
import { hasPermission } from "@/lib/admin";
import { uploadBuffer, UPLOAD_FOLDER } from "@/lib/cloudinary";
import { resolutionLabelFor } from "@/lib/wallpaper-input";
import { destroyUnusedAsset } from "@/lib/cloudinary-assets";
import { connectDB } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_IMAGE = 15 * 1024 * 1024;
const MAX_VIDEO = 100 * 1024 * 1024;

/**
 * Tải file hình nền / video / ảnh đại diện lên Cloudinary và trả về mô tả media
 * để form gửi kèm khi lưu. Tách khỏi bước lưu metadata để admin xem trước được
 * ảnh rồi mới bấm lưu, và để lưu lại không phải tải file lên lần nữa.
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

    const form = await req.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "media");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Chưa chọn file." }, { status: 400 });
    }

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      return NextResponse.json({ error: "Chỉ nhận file ảnh hoặc video." }, { status: 400 });
    }
    // Ảnh đại diện của video luôn phải là ảnh tĩnh
    if (kind === "thumbnail" && !isImage) {
      return NextResponse.json({ error: "Ảnh đại diện phải là file ảnh." }, { status: 400 });
    }

    const limit = isVideo ? MAX_VIDEO : MAX_IMAGE;
    if (file.size > limit) {
      return NextResponse.json(
        { error: `File quá lớn. Tối đa ${Math.round(limit / 1024 / 1024)}MB.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadBuffer(buffer, {
      folder: `${UPLOAD_FOLDER}/wallpapers`,
      resourceType: isVideo ? "video" : "image",
    });

    return NextResponse.json({
      media: {
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: isVideo ? "video" : "image",
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        duration: result.duration,
        alt: "",
      },
      resolutionLabel: resolutionLabelFor(result.width, result.height),
    });
  } catch (error) {
    console.error("Upload wallpaper error:", error);
    const message =
      error instanceof Error && error.message.includes("Cloudinary")
        ? "Chưa cấu hình Cloudinary. Kiểm tra CLOUDINARY_* trong .env.local."
        : "Tải file lên thất bại.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

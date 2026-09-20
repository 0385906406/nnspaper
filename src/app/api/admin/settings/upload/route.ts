import { auth } from "@/auth";
import { hasPermission, logAudit } from "@/lib/admin";
import { uploadBuffer, UPLOAD_FOLDER } from "@/lib/cloudinary";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/** Slot nào ghi đè lên public_id nào — cố định để thay ảnh không để lại file mồ côi. */
const SLOTS: Record<string, string> = {
  site_logo_image: "logo",
  site_favicon: "favicon",
};

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"];

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await hasPermission("setting.edit"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const form = await req.formData();
    const slot = String(form.get("slot") ?? "");
    const file = form.get("file");

    if (!SLOTS[slot]) {
      return NextResponse.json({ error: "Vị trí ảnh không hợp lệ." }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Chưa chọn file." }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: "Chỉ nhận ảnh PNG, JPG, WEBP, SVG hoặc ICO." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Ảnh không được lớn hơn 2MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadBuffer(buffer, {
      folder: `${UPLOAD_FOLDER}/branding`,
      resourceType: "image",
      // public_id cố định + overwrite: thay logo mới sẽ đè lên file cũ thay vì
      // để lại một loạt ảnh không ai dùng trên Cloudinary
      publicId: SLOTS[slot],
      overwrite: true,
    });

    await logAudit(
      session.user.id,
      "UPDATE",
      "setting",
      undefined,
      { [slot]: result.secure_url },
      `Tải lên ${slot === "site_favicon" ? "favicon" : "ảnh logo"}`
    );

    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    console.error("Upload branding error:", error);
    const message =
      error instanceof Error && error.message.includes("Cloudinary")
        ? "Chưa cấu hình Cloudinary. Kiểm tra CLOUDINARY_* trong .env.local."
        : "Tải ảnh lên thất bại.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

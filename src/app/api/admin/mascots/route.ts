import { auth } from "@/auth";
import { hasPermission, logAudit } from "@/lib/admin";
import { uploadBuffer, UPLOAD_FOLDER } from "@/lib/cloudinary";
import { connectDB } from "@/lib/mongodb";
import { MASCOT_SLUG_RE, isBuiltInMascot } from "@/lib/mascots";
import { Mascot, MASCOT_GROUP_KEYS } from "@/models/Mascot";
import { NextRequest, NextResponse } from "next/server";
import slugify from "slugify";

export const runtime = "nodejs";

/** Sprite là ảnh nhỏ (~40KB), thừa sức đi qua server nên không cần chữ ký như video. */
const MAX_SHEET = 2 * 1024 * 1024;
const ALLOWED = ["image/webp", "image/png"];

async function guard(permission: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!(await hasPermission(permission))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function GET() {
  const { error } = await guard("setting.view");
  if (error) return error;

  await connectDB();
  const mascots = await Mascot.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ mascots });
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await guard("setting.edit");
    if (error) return error;

    const form = await req.formData();
    const name = String(form.get("name") ?? "").trim();
    const group = String(form.get("group") ?? "animal");
    const rawSlug = String(form.get("slug") ?? "").trim();
    const directions = form.get("directions");
    const reactions = form.get("reactions");

    if (!name) return NextResponse.json({ error: "Chưa nhập tên nhân vật." }, { status: 400 });
    if (!MASCOT_GROUP_KEYS.includes(group as (typeof MASCOT_GROUP_KEYS)[number])) {
      return NextResponse.json({ error: "Nhóm không hợp lệ." }, { status: 400 });
    }

    const slug = slugify(rawSlug || name, { lower: true, strict: true, locale: "vi" });
    if (!MASCOT_SLUG_RE.test(slug)) {
      return NextResponse.json(
        { error: "Không tạo được slug từ tên này. Hãy nhập slug thủ công." },
        { status: 400 }
      );
    }
    // Trùng slug với bộ gốc sẽ khiến mascotSheets trả về file tĩnh trong public/
    // và nhân vật mới không bao giờ hiện ra — chặn ngay cho rõ ràng.
    if (isBuiltInMascot(slug)) {
      return NextResponse.json(
        { error: `"${slug}" trùng với một nhân vật có sẵn. Hãy đổi tên hoặc slug.` },
        { status: 409 }
      );
    }

    for (const [label, file] of [
      ["Sprite 9 hướng", directions],
      ["Sprite 9 biểu cảm", reactions],
    ] as const) {
      if (!(file instanceof File)) {
        return NextResponse.json({ error: `Chưa chọn ${label}.` }, { status: 400 });
      }
      if (!ALLOWED.includes(file.type)) {
        return NextResponse.json({ error: `${label} phải là WEBP hoặc PNG.` }, { status: 400 });
      }
      if (file.size > MAX_SHEET) {
        return NextResponse.json({ error: `${label} không được lớn hơn 2MB.` }, { status: 400 });
      }
    }

    await connectDB();
    if (await Mascot.exists({ slug })) {
      return NextResponse.json({ error: `Đã có nhân vật dùng slug "${slug}".` }, { status: 409 });
    }

    const folder = `${UPLOAD_FOLDER}/mascots`;
    const sheets: Record<string, { url: string; publicId: string }> = {};
    for (const [key, file] of [
      ["directions", directions as File],
      ["reactions", reactions as File],
    ] as const) {
      const result = await uploadBuffer(Buffer.from(await file.arrayBuffer()), {
        folder,
        resourceType: "image",
        publicId: `${slug}-${key}`,
        overwrite: true,
        // Sprite phải giữ nguyên pixel: nén tự động làm nhoè nhân vật kiểu pixel
        raw: true,
      });
      sheets[key] = { url: result.secure_url, publicId: result.public_id };
    }

    const mascot = await Mascot.create({
      slug,
      name,
      group,
      directions: sheets.directions,
      reactions: sheets.reactions,
    });

    await logAudit(
      session!.user!.id,
      "CREATE",
      "setting",
      mascot._id.toString(),
      { slug, name, group },
      `Thêm nhân vật "${name}"`
    );

    return NextResponse.json(mascot, { status: 201 });
  } catch (error) {
    console.error("POST mascot error:", error);
    return NextResponse.json({ error: "Không thêm được nhân vật." }, { status: 500 });
  }
}

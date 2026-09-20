import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { hasPermission, logAudit } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import { SETTING_DEFS, SETTINGS_CACHE_TAG } from "@/lib/settings";
import { SystemSettings } from "@/models/SystemSettings";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFS = new Map(SETTING_DEFS.map((d) => [d.key as string, d]));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trả về giá trị đã chuẩn hoá, hoặc thông báo lỗi nếu không hợp lệ. */
function validate(def: (typeof SETTING_DEFS)[number], raw: unknown): { value: unknown } | { error: string } {
  switch (def.type) {
    case "number": {
      const n = Number(raw);
      if (!Number.isFinite(n)) return { error: `"${def.description}" phải là số.` };
      // Số item mỗi trang bằng 0 sẽ làm trang công khai không hiện gì
      if (def.key === "wallpapers_per_page" && (n < 1 || n > 48)) {
        return { error: "Số hình nền mỗi trang phải từ 1 đến 48." };
      }
      return { value: n };
    }

    case "boolean":
      if (typeof raw !== "boolean") return { error: `"${def.description}" phải là true hoặc false.` };
      return { value: raw };

    case "json":
      if (!Array.isArray(raw) || raw.some((x) => typeof x !== "string")) {
        return { error: `"${def.description}" phải là danh sách chuỗi.` };
      }
      return { value: raw.map((s) => s.trim()).filter(Boolean) };

    case "email": {
      const s = String(raw ?? "").trim();
      if (!EMAIL_RE.test(s)) return { error: `"${def.description}" không phải email hợp lệ.` };
      return { value: s };
    }

    case "url": {
      const s = String(raw ?? "").trim();
      // URL là tuỳ chọn: để trống nghĩa là không dùng (vd. không đặt ảnh logo)
      if (!s) return { value: "" };
      let parsed: URL;
      try {
        parsed = new URL(s);
      } catch {
        return { error: `"${def.description}" phải là URL đầy đủ, ví dụ https://...` };
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { error: `"${def.description}" chỉ chấp nhận http hoặc https.` };
      }
      return { value: parsed.toString() };
    }

    default: {
      const s = String(raw ?? "").trim();

      if (def.key === "site_logo_mode" && s !== "text" && s !== "image") {
        return { error: "Kiểu logo chỉ nhận 'text' hoặc 'image'." };
      }

      if (!s) return { error: `"${def.description}" không được để trống.` };
      if (s.length > 500) return { error: `"${def.description}" không được dài quá 500 ký tự.` };
      return { value: s };
    }
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await hasPermission("setting.view"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const docs = await SystemSettings.find().lean();
    const stored = new Map(docs.map((d) => [d.key, d]));

    // Ghép theo SETTING_DEFS để trang Cài đặt luôn hiện đủ mục kể cả khi DB
    // chưa seed, và đúng thứ tự khai báo trong code
    const settings = SETTING_DEFS.map((def) => {
      const doc = stored.get(def.key);
      return {
        key: def.key,
        value: doc?.value ?? def.value,
        type: def.type,
        category: def.category,
        description: def.description,
        help: def.help,
        updatedAt: doc?.updatedAt ?? null,
      };
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("GET settings error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await hasPermission("setting.edit"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Nhận cả { key, value } lẫn { updates: {...} } để lưu nhiều mục một lần
    const updates: Record<string, unknown> =
      body.updates && typeof body.updates === "object"
        ? body.updates
        : body.key
          ? { [body.key]: body.value }
          : {};

    const entries = Object.entries(updates);
    if (entries.length === 0) {
      return NextResponse.json({ error: "Không có thay đổi nào để lưu." }, { status: 400 });
    }

    // Kiểm tra hết trước rồi mới ghi: tránh lưu được nửa chừng rồi lỗi
    const validated: { key: string; value: unknown }[] = [];
    for (const [key, raw] of entries) {
      const def = DEFS.get(key);
      if (!def) {
        return NextResponse.json({ error: `Cài đặt "${key}" không tồn tại.` }, { status: 400 });
      }
      const result = validate(def, raw);
      if ("error" in result) {
        return NextResponse.json({ error: result.error, key }, { status: 400 });
      }
      validated.push({ key, value: result.value });
    }

    await connectDB();

    const changed: Record<string, unknown> = {};
    for (const { key, value } of validated) {
      const def = DEFS.get(key)!;
      const before = await SystemSettings.findOne({ key }).lean();
      if (before && JSON.stringify(before.value) === JSON.stringify(value)) continue;

      await SystemSettings.findOneAndUpdate(
        { key },
        {
          $set: {
            value,
            updatedBy: session.user.id,
            type: def.type,
            category: def.category,
            description: def.description,
            help: def.help,
          },
        },
        { upsert: true, new: true }
      );
      changed[key] = value;
    }

    if (Object.keys(changed).length > 0) {
      await logAudit(
        session.user.id,
        "UPDATE",
        "setting",
        undefined,
        changed,
        `Cập nhật cài đặt: ${Object.keys(changed).join(", ")}`
      );

      // Trang công khai đọc settings khi render, phải xoá cache để đổi có hiệu lực ngay
      // expire: 0 -> request kế tiếp đọc lại DB ngay, không phục vụ bản cũ. Admin vừa
      // lưu là phải thấy đổi liền, nên không dùng stale-while-revalidate ở đây.
      revalidateTag(SETTINGS_CACHE_TAG, { expire: 0 });
      revalidatePath("/", "layout");
    }

    return NextResponse.json({
      message: Object.keys(changed).length
        ? `Đã lưu ${Object.keys(changed).length} thay đổi.`
        : "Không có gì thay đổi.",
      changed: Object.keys(changed),
    });
  } catch (error) {
    console.error("PUT settings error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

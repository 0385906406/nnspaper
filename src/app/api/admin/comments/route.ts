import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/admin";
import { guard } from "@/lib/admin-guard";
import { connectDB } from "@/lib/mongodb";
import { syncCommentCount, VISIBLE } from "@/lib/comments";
import { Comment } from "@/models/Comment";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/** GET /api/admin/comments — danh sách bình luận có lọc + phân trang. */
export async function GET(req: NextRequest) {
  try {
    const { error } = await guard("comment.view");
    if (error) return error;

    await connectDB();

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get("page") || "1") || 1);
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "20") || 20));

    const query: Record<string, unknown> = {};

    const status = sp.get("status");
    if (status === "hidden") query.status = "hidden";
    else if (status === "visible") Object.assign(query, VISIBLE);

    const wallpaper = sp.get("wallpaper")?.trim();
    if (wallpaper) query.wallpaperSlug = wallpaper;

    const userId = sp.get("user")?.trim();
    if (userId) query.userId = userId;

    // Regex để gõ một phần tên/nội dung vẫn khớp ($text chỉ khớp trọn từ)
    const q = sp.get("q")?.trim();
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { content: { $regex: safe, $options: "i" } },
        { userName: { $regex: safe, $options: "i" } },
        { wallpaperTitle: { $regex: safe, $options: "i" } },
      ];
    }

    const sort: Record<string, 1 | -1> =
      sp.get("sort") === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

    const [comments, total, hiddenCount] = await Promise.all([
      Comment.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Comment.countDocuments(query),
      Comment.countDocuments({ status: "hidden" }),
    ]);

    return NextResponse.json({
      comments,
      hiddenCount,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET comments error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

const bulkSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  action: z.enum(["hide", "show", "delete"]),
});

const BULK_LABELS = { hide: "Ẩn", show: "Hiện lại", delete: "Xoá" } as const;

/** POST /api/admin/comments — thao tác hàng loạt: ẩn / hiện / xoá. */
export async function POST(req: NextRequest) {
  try {
    const parsed = bulkSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }
    const { action } = parsed.data;
    const ids = parsed.data.ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

    const { session, error } = await guard(action === "delete" ? "comment.delete" : "comment.edit");
    if (error) return error;

    await connectDB();
    const targets = await Comment.find({ _id: { $in: ids } })
      .select({ wallpaperSlug: 1 })
      .lean<{ wallpaperSlug: string }[]>();
    if (!targets.length) {
      return NextResponse.json({ error: "Không tìm thấy bình luận" }, { status: 404 });
    }

    if (action === "delete") {
      await Comment.deleteMany({ _id: { $in: ids } });
    } else {
      await Comment.updateMany(
        { _id: { $in: ids } },
        { $set: { status: action === "hide" ? "hidden" : "visible" } }
      );
    }

    const slugs = [...new Set(targets.map((t) => t.wallpaperSlug))];
    await syncCommentCount(slugs);

    await logAudit(
      session.user.id,
      action === "delete" ? "DELETE" : "UPDATE",
      "comment",
      undefined,
      { ids, action },
      `${BULK_LABELS[action]} ${targets.length} bình luận`
    );

    for (const slug of slugs) revalidatePath(`/hinh-nen/${slug}`);
    return NextResponse.json({ affected: targets.length });
  } catch (error) {
    console.error("POST comments bulk error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

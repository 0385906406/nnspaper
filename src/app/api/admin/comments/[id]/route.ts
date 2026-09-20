import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/admin";
import { guard } from "@/lib/admin-guard";
import { connectDB } from "@/lib/mongodb";
import { syncCommentCount } from "@/lib/comments";
import { Comment } from "@/models/Comment";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const patchSchema = z.object({ status: z.enum(["visible", "hidden"]) });

/** PATCH /api/admin/comments/[id] — ẩn hoặc hiện lại một bình luận. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, error } = await guard("comment.edit");
    if (error) return error;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
    }

    await connectDB();
    const comment = await Comment.findByIdAndUpdate(
      id,
      { $set: { status: parsed.data.status } },
      { new: true }
    );
    if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await syncCommentCount(comment.wallpaperSlug);
    await logAudit(
      session.user.id,
      "UPDATE",
      "comment",
      id,
      { status: parsed.data.status },
      `${parsed.data.status === "hidden" ? "Ẩn" : "Hiện lại"} bình luận của ${comment.userName} tại "${comment.wallpaperTitle}"`
    );

    revalidatePath(`/hinh-nen/${comment.wallpaperSlug}`);
    return NextResponse.json(comment);
  } catch (error) {
    console.error("PATCH comment error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** DELETE /api/admin/comments/[id] — xoá hẳn một bình luận. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, error } = await guard("comment.delete");
    if (error) return error;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await connectDB();
    const comment = await Comment.findByIdAndDelete(id);
    if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await syncCommentCount(comment.wallpaperSlug);
    await logAudit(
      session.user.id,
      "DELETE",
      "comment",
      id,
      { content: comment.content },
      `Xoá bình luận của ${comment.userName} tại "${comment.wallpaperTitle}"`
    );

    revalidatePath(`/hinh-nen/${comment.wallpaperSlug}`);
    return NextResponse.json({ message: "Đã xoá." });
  } catch (error) {
    console.error("DELETE comment error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

import mongoose from "mongoose";
import { auth } from "@/auth";
import { hasPermission, logAudit } from "@/lib/admin";
import { destroyAsset } from "@/lib/cloudinary";
import { connectDB } from "@/lib/mongodb";
import { DEFAULT_MASCOT } from "@/lib/mascots";
import { Mascot, MASCOT_GROUP_KEYS } from "@/models/Mascot";
import { User } from "@/models/User";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

async function guard() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!(await hasPermission("setting.edit"))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

/** Đổi tên, đổi nhóm, hoặc bật/tắt một nhân vật. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, error } = await guard();
    if (error) return error;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { name, group, isActive } = await req.json();
    const updates: Record<string, unknown> = {};

    if (name !== undefined) {
      const clean = String(name).trim();
      if (!clean) return NextResponse.json({ error: "Tên không được để trống." }, { status: 400 });
      updates.name = clean;
    }
    if (group !== undefined) {
      if (!MASCOT_GROUP_KEYS.includes(group)) {
        return NextResponse.json({ error: "Nhóm không hợp lệ." }, { status: 400 });
      }
      updates.group = group;
    }
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    await connectDB();
    const mascot = await Mascot.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!mascot) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Tắt nhân vật thì ai đang chọn nó sẽ mất avatar — chuyển họ về mặc định
    let movedUsers = 0;
    if (updates.isActive === false) {
      const res = await User.updateMany({ mascot: mascot.slug }, { mascot: DEFAULT_MASCOT });
      movedUsers = res.modifiedCount ?? 0;
    }

    await logAudit(
      session!.user!.id,
      "UPDATE",
      "setting",
      id,
      { ...updates, movedUsers },
      `Cập nhật nhân vật "${mascot.name}"`
    );

    return NextResponse.json({ mascot, movedUsers });
  } catch (error) {
    console.error("PATCH mascot error:", error);
    return NextResponse.json({ error: "Không cập nhật được nhân vật." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, error } = await guard();
    if (error) return error;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await connectDB();
    const mascot = await Mascot.findById(id);
    if (!mascot) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await Mascot.findByIdAndDelete(id);

    // Người đang chọn nhân vật vừa xoá phải được chuyển về mặc định, không thì
    // avatar của họ trỏ tới một route 404
    const moved = await User.updateMany({ mascot: mascot.slug }, { mascot: DEFAULT_MASCOT });

    // Dọn sprite trên Cloudinary. Hỏng bước này không được làm hỏng việc xoá.
    for (const sheet of [mascot.directions, mascot.reactions]) {
      if (!sheet?.publicId) continue;
      try {
        await destroyAsset(sheet.publicId, "image");
      } catch (err) {
        console.error("Không xoá được sprite:", sheet.publicId, err);
      }
    }

    await logAudit(
      session!.user!.id,
      "DELETE",
      "setting",
      id,
      { slug: mascot.slug, movedUsers: moved.modifiedCount ?? 0 },
      `Xoá nhân vật "${mascot.name}"`
    );

    return NextResponse.json({ message: "Đã xoá.", movedUsers: moved.modifiedCount ?? 0 });
  } catch (error) {
    console.error("DELETE mascot error:", error);
    return NextResponse.json({ error: "Không xoá được nhân vật." }, { status: 500 });
  }
}

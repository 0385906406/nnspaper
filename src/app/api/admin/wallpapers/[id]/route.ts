import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { hasPermission, logAudit } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import { destroyAsset, destroyUnusedAsset } from "@/lib/cloudinary-assets";
import { normalizeWallpaperInput } from "@/lib/wallpaper-input";
import { syncSearchText } from "@/lib/wallpapers";
import {
  purgeWallpaperInteractions,
  renameWallpaperSlug,
  renameWallpaperTitle,
} from "@/lib/interactions";
import { Wallpaper } from "@/models/Wallpaper";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function invalidId(id: string) {
  return !mongoose.Types.ObjectId.isValid(id);
}

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { error } = await guard("wallpaper.view");
    if (error) return error;
    if (invalidId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await connectDB();
    const wallpaper = await Wallpaper.findById(id).lean();
    if (!wallpaper) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(wallpaper);
  } catch (error) {
    console.error("GET wallpaper error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, error } = await guard("wallpaper.edit");
    if (error) return error;
    if (invalidId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await connectDB();
    const current = await Wallpaper.findById(id);
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // partial: body cũ được đưa thẳng vào findByIdAndUpdate nên chỉ cần gửi thiếu
    // một trường là ghi đè rỗng; giờ chỉ những khoá thực sự có mặt mới được xử lý.
    const result = await normalizeWallpaperInput(await req.json(), { partial: true });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (result.data.slug && result.data.slug !== current.slug) {
      const clash = await Wallpaper.findOne({ slug: result.data.slug, _id: { $ne: id } });
      if (clash) {
        return NextResponse.json({ error: "Đường dẫn (slug) đã được dùng." }, { status: 409 });
      }
    }

    // Đổi trạng thái mà không đổi gì khác thì giữ nguyên publishedAt đã có,
    // nếu không mỗi lần sửa lặt vặt ảnh lại nhảy lên đầu trang chủ
    if (result.data.status === "published" && current.status === "published") {
      delete result.data.publishedAt;
    }

    const updated = await Wallpaper.findByIdAndUpdate(id, result.data, {
      new: true,
      runValidators: true,
    });

    if (updated) await syncSearchText({ _id: updated._id });

    if (updated && updated.slug !== current.slug) {
      await renameWallpaperSlug(current.slug, updated.slug);
    }
    if (updated && updated.title !== current.title) {
      await renameWallpaperTitle(updated.slug, updated.title);
    }

    // Đã thay file ảnh/video/thumbnail thì xoá file cũ trên Cloudinary, không để mồ côi
    if (updated) {
      const keep = new Set([updated.media?.publicId, updated.thumbnail?.publicId].filter(Boolean));
      for (const old of [current.media, current.thumbnail]) {
        if (!old?.publicId || keep.has(old.publicId)) continue;
        await destroyUnusedAsset(old.publicId, old.resourceType === "video" ? "video" : "image");
      }
    }

    await logAudit(
      session!.user!.id,
      "UPDATE",
      "wallpaper",
      id,
      result.data,
      `Cập nhật hình nền "${current.title}"`
    );

    revalidatePath("/", "layout");

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      return NextResponse.json({ error: "Đường dẫn (slug) đã tồn tại." }, { status: 409 });
    }
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("PUT wallpaper error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, error } = await guard("wallpaper.delete");
    if (error) return error;
    if (invalidId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await connectDB();
    const wallpaper = await Wallpaper.findById(id);
    if (!wallpaper) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await Wallpaper.findByIdAndDelete(id);
    await purgeWallpaperInteractions(wallpaper.slug);

    // Xoá bản ghi mà để file lại thì Cloudinary đầy dần bằng ảnh không ai tham
    // chiếu. Hỏng bước này cũng không nên làm hỏng việc xoá.
    for (const asset of [wallpaper.media, wallpaper.thumbnail]) {
      if (!asset?.publicId) continue;
      try {
        await destroyAsset(asset.publicId, asset.resourceType === "video" ? "video" : "image");
      } catch (err) {
        console.error("Không xoá được file trên Cloudinary:", asset.publicId, err);
      }
    }

    await logAudit(
      session!.user!.id,
      "DELETE",
      "wallpaper",
      id,
      { title: wallpaper.title },
      `Xoá hình nền "${wallpaper.title}"`
    );

    revalidatePath("/", "layout");

    return NextResponse.json({ message: "Đã xoá." });
  } catch (error) {
    console.error("DELETE wallpaper error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

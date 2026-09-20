import mongoose from "mongoose";
import { guard } from "@/lib/admin-guard";
import { connectDB } from "@/lib/mongodb";
import type { LikerView } from "@/lib/likes";
import { User } from "@/models/User";
import { avatarMascot } from "@/lib/mascots";
import { Wallpaper } from "@/models/Wallpaper";
import { WallpaperLike } from "@/models/WallpaperLike";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/** GET /api/admin/wallpapers/[id]/likes — ai đã thả tim hình nền này, mới nhất trước. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { error } = await guard("wallpaper.view");
    if (error) return error;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await connectDB();
    const wallpaper = await Wallpaper.findById(id)
      .select({ slug: 1 })
      .lean<{ slug: string } | null>();
    if (!wallpaper) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get("page") || "1") || 1);
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "20") || 20));

    const [likes, total] = await Promise.all([
      WallpaperLike.find({ wallpaperSlug: wallpaper.slug })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<{ userId: string; createdAt: Date }[]>(),
      WallpaperLike.countDocuments({ wallpaperSlug: wallpaper.slug }),
    ]);

    const userIds = likes.map((l) => l.userId).filter((u) => mongoose.Types.ObjectId.isValid(u));
    const users = await User.find({ _id: { $in: userIds } })
      .select({ name: 1, email: 1, mascot: 1 })
      .lean<{ _id: unknown; name?: string; email?: string; mascot?: string }[]>();
    const byId = new Map(users.map((u) => [String(u._id), u]));

    const likers: LikerView[] = likes.map((l) => {
      const u = byId.get(l.userId);
      return {
        userId: l.userId,
        name: u?.name || u?.email || "(Tài khoản đã xoá)",
        email: u?.email ?? "",
        mascot: avatarMascot(u?.mascot),
        likedAt: new Date(l.createdAt).toISOString(),
      };
    });

    return NextResponse.json({
      likers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET wallpaper likes error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

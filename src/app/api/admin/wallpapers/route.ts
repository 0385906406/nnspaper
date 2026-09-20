import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { hasPermission, logAudit } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import { normalizeWallpaperInput } from "@/lib/wallpaper-input";
import { escapeRegex, searchTokens, wordPrefixPattern } from "@/lib/search-text";
import { Wallpaper } from "@/models/Wallpaper";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasPermission("wallpaper.view"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get("page") || "1") || 1);
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "50") || 50));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    const status = sp.get("status");
    if (status === "draft" || status === "published") query.status = status;

    const mediaType = sp.get("mediaType");
    if (mediaType === "image" || mediaType === "video") query.mediaType = mediaType;

    const deviceType = sp.get("deviceType");
    if (deviceType === "pc" || deviceType === "phone" || deviceType === "both") {
      query.deviceType = deviceType;
    }

    const category = sp.get("category")?.trim();
    if (category) query.categorySlug = category;

    // Tìm trên searchText (không dấu, khớp một phần: "furi", "phong canh" đều ra),
    // kèm slug để dán nguyên đường dẫn vào vẫn tìm được
    const q = sp.get("q")?.trim();
    const tokens = q ? searchTokens(q) : [];
    if (q && tokens.length) {
      query.$or = [
        { $and: tokens.map((t) => ({ searchText: { $regex: wordPrefixPattern(t) } })) },
        { slug: { $regex: escapeRegex(q.toLowerCase()) } },
      ];
    }

    const sortKey = sp.get("sort");
    const SORTS: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      views: { views: -1 },
      likes: { likes: -1 },
      downloads: { downloads: -1 },
      comments: { commentCount: -1 },
    };
    const sort = SORTS[sortKey ?? "newest"] ?? SORTS.newest;

    const [wallpapers, total] = await Promise.all([
      Wallpaper.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Wallpaper.countDocuments(query),
    ]);

    return NextResponse.json({
      wallpapers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET wallpapers error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasPermission("wallpaper.create"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const result = await normalizeWallpaperInput(await req.json());
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Slug trùng đã được normalizeWallpaperInput nối thêm mốc thời gian đăng,
    // nên ở đây không còn phải chặn; E11000 bên dưới lo nốt trường hợp hai
    // request cùng tiêu đề chạy song song và cùng giành một slug.
    const wallpaper = await Wallpaper.create(result.data);

    await logAudit(
      session.user.id,
      "CREATE",
      "wallpaper",
      wallpaper._id.toString(),
      { title: wallpaper.title, categorySlug: wallpaper.categorySlug },
      `Tạo hình nền "${wallpaper.title}"`
    );

    // Trang chủ và trang chủ đề render sẵn danh sách, không xoá cache thì ảnh mới không xuất hiện
    revalidatePath("/", "layout");

    return NextResponse.json(wallpaper, { status: 201 });
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      return NextResponse.json({ error: "Đường dẫn (slug) đã tồn tại." }, { status: 409 });
    }
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST wallpaper error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

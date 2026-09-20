import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { hasPermission, logAudit } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { resolveParent } from "@/lib/wallpaper-input";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasPermission("category.view"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get("page") || "1") || 1);
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "20") || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    const q = sp.get("q")?.trim();
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { name: { $regex: safe, $options: "i" } },
        { slug: { $regex: safe, $options: "i" } },
        { description: { $regex: safe, $options: "i" } },
      ];
    }

    const [categories, total] = await Promise.all([
      Category.find(query).sort({ order: 1, name: 1 }).skip(skip).limit(limit),
      Category.countDocuments(query),
    ]);

    return NextResponse.json({
      categories,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET categories error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasPermission("category.create"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug, icon, description, order } = body;

    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanSlug = typeof slug === "string" ? slug.trim().toLowerCase() : "";

    if (!cleanName) {
      return NextResponse.json({ error: "Tên danh mục không được để trống." }, { status: 400 });
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug)) {
      return NextResponse.json(
        { error: "Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang." },
        { status: 400 }
      );
    }

    await connectDB();

    if (await Category.findOne({ slug: cleanSlug })) {
      return NextResponse.json({ error: "Slug đã được dùng cho danh mục khác." }, { status: 409 });
    }

    const parentResult = await resolveParent(body.parent);
    if ("error" in parentResult) {
      return NextResponse.json({ error: parentResult.error }, { status: 400 });
    }

    const category = await Category.create({
      name: cleanName,
      slug: cleanSlug,
      icon: typeof icon === "string" ? icon : "",
      description: typeof description === "string" ? description.trim() : "",
      order: Number.isFinite(Number(order)) ? Number(order) : 0,
      parentId: parentResult.parent,
    });

    await logAudit(
      session.user.id,
      "CREATE",
      "category",
      category._id.toString(),
      { name: cleanName, slug: cleanSlug },
      `Tạo danh mục "${cleanName}"`
    );

    revalidatePath("/", "layout");

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      return NextResponse.json({ error: "Slug đã tồn tại." }, { status: 409 });
    }
    console.error("POST category error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

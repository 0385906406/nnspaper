import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { hasPermission, logAudit } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { resolveParent } from "@/lib/wallpaper-input";
import { syncSearchText } from "@/lib/wallpapers";
import { Wallpaper } from "@/models/Wallpaper";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
    const { error } = await guard("category.view");
    if (error) return error;
    if (invalidId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await connectDB();
    const category = await Category.findById(id).lean();
    if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(category);
  } catch (error) {
    console.error("GET category error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, error } = await guard("category.edit");
    if (error) return error;
    if (invalidId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await connectDB();
    const current = await Category.findById(id);
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { name, slug, icon, description, order } = body;

    const cleanName = typeof name === "string" ? name.trim() : "";
    if (!cleanName) return NextResponse.json({ error: "Tên danh mục không được để trống." }, { status: 400 });

    const cleanSlug = typeof slug === "string" ? slug.trim().toLowerCase() : "";
    if (!SLUG_RE.test(cleanSlug)) {
      return NextResponse.json(
        { error: "Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang." },
        { status: 400 }
      );
    }

    if (cleanSlug !== current.slug && (await Category.findOne({ slug: cleanSlug, _id: { $ne: id } }))) {
      return NextResponse.json({ error: "Slug đã được dùng cho danh mục khác." }, { status: 409 });
    }

    const parentResult = await resolveParent(body.parent, id);
    if ("error" in parentResult) {
      return NextResponse.json({ error: parentResult.error }, { status: 400 });
    }

    // Danh mục đang có con thì không thể trở thành con của danh mục khác — như
    // vậy sẽ thành ba cấp, mà thanh chủ đề và truy vấn chỉ dựng cho hai.
    if (parentResult.parent) {
      const childCount = await Category.countDocuments({ parentId: current._id });
      if (childCount > 0) {
        return NextResponse.json(
          { error: `Danh mục này đang có ${childCount} danh mục con nên không thể đặt làm danh mục con.` },
          { status: 400 }
        );
      }
    }

    const updated = await Category.findByIdAndUpdate(
      id,
      {
        name: cleanName,
        slug: cleanSlug,
        icon: typeof icon === "string" ? icon : current.icon,
        description: typeof description === "string" ? description.trim() : "",
        order: Number.isFinite(Number(order)) ? Number(order) : current.order,
        parentId: parentResult.parent,
      },
      { new: true, runValidators: true }
    );

    // Hình nền lưu sẵn categorySlug/categoryName để khỏi populate mỗi lần render.
    // Đổi danh mục mà không đồng bộ lại thì trang chủ đề trống trơn còn card hiện tên cũ.
    if (cleanSlug !== current.slug || cleanName !== current.name) {
      const synced = await Wallpaper.updateMany(
        { category: current._id },
        { $set: { categorySlug: cleanSlug, categoryName: cleanName } }
      );
      console.log(`[category] đồng bộ ${synced.modifiedCount} hình nền sang slug "${cleanSlug}"`);
      // Tên danh mục nằm trong chuỗi tìm kiếm của hình nền
      if (cleanName !== current.name) await syncSearchText({ category: current._id });
    }

    await logAudit(
      session!.user!.id,
      "UPDATE",
      "category",
      id,
      { name: cleanName, slug: cleanSlug },
      `Cập nhật danh mục "${cleanName}"`
    );

    revalidatePath("/", "layout");

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      return NextResponse.json({ error: "Slug đã tồn tại." }, { status: 409 });
    }
    console.error("PUT category error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, error } = await guard("category.delete");
    if (error) return error;
    if (invalidId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await connectDB();
    const category = await Category.findById(id);
    if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const childCount = await Category.countDocuments({ parentId: category._id });
    if (childCount > 0) {
      return NextResponse.json(
        { error: `Danh mục đang có ${childCount} danh mục con. Hãy xoá hoặc chuyển chúng đi trước.` },
        { status: 409 }
      );
    }

    // Xoá danh mục còn hình nền sẽ để lại các ảnh trỏ vào danh mục không tồn tại:
    // trang chủ đề 404 mà ảnh vẫn nằm trong trang chủ với tên danh mục ma.
    const used = await Wallpaper.countDocuments({ category: category._id });
    if (used > 0) {
      return NextResponse.json(
        { error: `Danh mục đang có ${used} hình nền. Hãy chuyển chúng sang danh mục khác trước.` },
        { status: 409 }
      );
    }

    await Category.findByIdAndDelete(id);

    await logAudit(
      session!.user!.id,
      "DELETE",
      "category",
      id,
      { name: category.name },
      `Xoá danh mục "${category.name}"`
    );

    revalidatePath("/", "layout");

    return NextResponse.json({ message: "Đã xoá." });
  } catch (error) {
    console.error("DELETE category error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

import mongoose from "mongoose";
import { auth } from "@/auth";
import { hasPermission, logAudit } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import { purgeUserInteractions } from "@/lib/interactions";
import { User, ROLE_SLUGS, type RoleSlug } from "@/models/User";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/** Không bao giờ trả mã xác thực email ra ngoài, kể cả cho admin. */
const HIDDEN_FIELDS = "-verificationToken -verificationTokenExpires";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{8,15}$/;

/** Chặn sớm id sai định dạng, nếu không Mongoose ném CastError và route trả 500. */
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
    const { error } = await guard("user.view");
    if (error) return error;
    if (invalidId(id)) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await connectDB();
    const user = await User.findById(id).select(HIDDEN_FIELDS);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET user error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, error } = await guard("user.edit");
    if (error) return error;
    if (invalidId(id)) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await connectDB();
    const target = await User.findById(id);
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { name, email, phone, role, isActive } = await req.json();

    if (role !== undefined && !ROLE_SLUGS.includes(role as RoleSlug)) {
      return NextResponse.json(
        { error: `Role không hợp lệ. Chọn một trong: ${ROLE_SLUGS.join(", ")}` },
        { status: 400 }
      );
    }

    // Không cho tự hạ quyền hoặc tự khoá mình — sẽ tự đá mình ra khỏi trang quản trị
    const isSelf = session!.user!.id === id;
    if (isSelf && (role !== undefined && role !== target.role)) {
      return NextResponse.json({ error: "Không thể tự đổi quyền của chính mình." }, { status: 400 });
    }
    if (isSelf && isActive === false) {
      return NextResponse.json({ error: "Không thể tự khoá tài khoản của chính mình." }, { status: 400 });
    }

    // Hạ quyền admin cuối cùng sẽ khiến không ai vào được trang quản trị nữa
    const losingAdmin = target.role === "admin" && ((role !== undefined && role !== "admin") || isActive === false);
    if (losingAdmin) {
      const activeAdmins = await User.countDocuments({ role: "admin", isActive: true });
      if (activeAdmins <= 1) {
        return NextResponse.json(
          { error: "Đây là admin hoạt động duy nhất. Hãy tạo admin khác trước." },
          { status: 400 }
        );
      }
    }

    const updates: Record<string, unknown> = {};
    // email/phone là unique + sparse: để trống thì phải xoá hẳn trường, lưu chuỗi
    // rỗng sẽ đụng unique với tài khoản khác cũng để trống
    const unset: Record<string, 1> = {};

    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (!cleanName) return NextResponse.json({ error: "Tên không được để trống." }, { status: 400 });
      updates.name = cleanName;
    }

    let nextEmail = target.email ?? "";
    if (email !== undefined) {
      nextEmail = String(email).toLowerCase().trim();
      if (nextEmail && !EMAIL_RE.test(nextEmail)) {
        return NextResponse.json({ error: "Email không hợp lệ." }, { status: 400 });
      }
      if (nextEmail) updates.email = nextEmail;
      else unset.email = 1;
    }

    let nextPhone = target.phone ?? "";
    if (phone !== undefined) {
      nextPhone = String(phone).replace(/[\s.-]/g, "");
      if (nextPhone && !PHONE_RE.test(nextPhone)) {
        return NextResponse.json({ error: "Số điện thoại không hợp lệ." }, { status: 400 });
      }
      if (nextPhone) updates.phone = nextPhone;
      else unset.phone = 1;
    }

    if (!nextEmail && !nextPhone) {
      return NextResponse.json({ error: "Tài khoản cần có email hoặc số điện thoại." }, { status: 400 });
    }

    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: updates, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { new: true, runValidators: true }
    ).select(HIDDEN_FIELDS);

    await logAudit(session!.user!.id, "UPDATE", "user", id, updates, `Updated user: ${target.email}`);

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      return NextResponse.json({ error: "Email hoặc số điện thoại đã được sử dụng." }, { status: 409 });
    }
    console.error("PUT user error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, error } = await guard("user.delete");
    if (error) return error;
    if (invalidId(id)) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await connectDB();
    const user = await User.findById(id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (session!.user!.id === id) {
      return NextResponse.json({ error: "Không thể xoá tài khoản của chính mình." }, { status: 400 });
    }

    if (user.role === "admin") {
      const activeAdmins = await User.countDocuments({ role: "admin", isActive: true });
      if (activeAdmins <= 1) {
        return NextResponse.json(
          { error: "Đây là admin hoạt động duy nhất. Hãy tạo admin khác trước." },
          { status: 400 }
        );
      }
    }

    await User.findByIdAndDelete(id);
    // Bình luận, tim, yêu thích của tài khoản đã xoá không còn ai quản lý — dọn luôn
    await purgeUserInteractions(id);
    await logAudit(session!.user!.id, "DELETE", "user", id, {}, `Deleted user: ${user.email}`);

    return NextResponse.json({ message: "User deleted" });
  } catch (error) {
    console.error("DELETE user error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

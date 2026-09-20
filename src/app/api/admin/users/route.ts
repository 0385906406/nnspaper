import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { hasPermission, logAudit } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import { User, ROLE_SLUGS, type RoleSlug } from "@/models/User";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await hasPermission("user.view"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get("page") || "1") || 1);
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "10") || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    const role = sp.get("role");
    if (role && ROLE_SLUGS.includes(role as RoleSlug)) filter.role = role;

    const status = sp.get("status");
    if (status === "active") filter.isActive = true;
    if (status === "disabled") filter.isActive = false;

    const search = sp.get("q")?.trim();
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { email: { $regex: safe, $options: "i" } },
        { name: { $regex: safe, $options: "i" } },
        { phone: { $regex: safe, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-verificationToken -verificationTokenExpires")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return NextResponse.json({
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET users error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await hasPermission("user.create"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email, name, role, password } = await req.json();

    if (!email || !name || !role) {
      return NextResponse.json({ error: "Thiếu email, tên hoặc quyền." }, { status: 400 });
    }
    if (!ROLE_SLUGS.includes(role as RoleSlug)) {
      return NextResponse.json(
        { error: `Role không hợp lệ. Chọn một trong: ${ROLE_SLUGS.join(", ")}` },
        { status: 400 }
      );
    }
    // Không có mật khẩu thì tài khoản tạo ra sẽ không đăng nhập được bằng email
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Mật khẩu phải có ít nhất 8 ký tự." }, { status: 400 });
    }

    await connectDB();

    const normalizedEmail = email.toLowerCase().trim();
    if (await User.findOne({ email: normalizedEmail })) {
      return NextResponse.json({ error: "Email đã được sử dụng." }, { status: 409 });
    }

    const user = await User.create({
      email: normalizedEmail,
      name,
      role,
      password: await bcrypt.hash(password, 12),
      isActive: true,
      // Admin tạo tài khoản thì coi như đã xác thực, không cần gửi mail kích hoạt
      emailVerified: new Date(),
    });

    await logAudit(
      session.user.id,
      "CREATE",
      "user",
      user._id.toString(),
      { email: normalizedEmail, role },
      `Created user: ${normalizedEmail}`
    );

    const { password: _omit, ...safeUser } = user.toObject();
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      return NextResponse.json({ error: "Email đã được sử dụng." }, { status: 409 });
    }
    console.error("POST user error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { seedRolesAndPermissions, seedSettings } from "@/lib/admin";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Role } from "@/models/Role";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

/**
 * Khởi tạo roles/permissions/settings và tài khoản admin đầu tiên.
 * Chỉ chạy được khi gửi kèm header `x-admin-token` khớp ADMIN_TOKEN — trước đây
 * endpoint này mở công khai nên bất kỳ ai cũng tạo được admin với mật khẩu biết trước.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();

  try {
    await connectDB();

    await seedRolesAndPermissions();
    await seedSettings();

    const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase().trim();
    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Đã seed roles, permissions và settings. Đặt SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD nếu muốn tạo thêm tài khoản admin." },
        { status: 200 }
      );
    }

    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      return NextResponse.json({ message: "Tài khoản admin đã tồn tại." }, { status: 200 });
    }

    await User.create({
      email,
      name: "Admin",
      password: await bcrypt.hash(password, 12),
      role: "admin",
      isActive: true,
      emailVerified: new Date(),
    });

    return NextResponse.json({ message: "Seed thành công.", admin: { email } });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();

  try {
    await connectDB();
    const [adminCount, roleCount] = await Promise.all([
      User.countDocuments({ role: "admin" }),
      Role.countDocuments(),
    ]);

    return NextResponse.json({ seeded: adminCount > 0 && roleCount > 0, adminCount, roleCount });
  } catch {
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}

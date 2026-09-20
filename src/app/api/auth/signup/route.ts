import mongoose from "mongoose";
import { User } from "@/models/User";
import { connectDB } from "@/lib/mongodb";
import { getSettings } from "@/lib/settings";
import { sendVerificationEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, confirmPassword } = await req.json();

    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json({ error: "Vui lòng nhập đầy đủ thông tin." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Email không hợp lệ." }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Mật khẩu xác nhận không khớp." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Mật khẩu phải có ít nhất 8 ký tự." }, { status: 400 });
    }

    // Ẩn form ở giao diện là chưa đủ — vẫn gọi thẳng API được, phải chặn ở đây
    if (!(await getSettings()).allow_registration) {
      return NextResponse.json(
        { error: "Việc đăng ký tài khoản mới đang tạm khoá." },
        { status: 403 }
      );
    }

    await connectDB();

    const normalizedEmail = email.toLowerCase().trim();
    if (await User.findOne({ email: normalizedEmail })) {
      return NextResponse.json({ error: "Email đã được đăng ký." }, { status: 409 });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      verificationToken,
      verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      // Đăng ký công khai luôn là viewer; quyền cao hơn do admin cấp trong /admin/users
      role: "viewer",
      // isActive nói về "bị khoá hay không", còn "chưa xác thực" thể hiện qua
      // emailVerified — tách bạch để trang đăng nhập báo đúng lý do cho người dùng.
      isActive: true,
    });

    const emailSent = await sendVerificationEmail(normalizedEmail, verificationToken);

    if (!emailSent) {
      // Gỡ bản ghi vừa tạo, nếu không email này sẽ bị kẹt: không đăng ký lại được
      // mà cũng không bao giờ nhận được link xác thực.
      await User.findByIdAndDelete(user._id);
      return NextResponse.json(
        { error: "Không gửi được email xác thực. Vui lòng thử lại sau." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { message: "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản." },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      return NextResponse.json({ error: "Email đã được đăng ký." }, { status: 409 });
    }
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống. Vui lòng thử lại." }, { status: 500 });
  }
}

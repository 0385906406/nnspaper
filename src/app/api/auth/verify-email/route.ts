import { User } from "@/models/User";
import { connectDB } from "@/lib/mongodb";
import { sendWelcomeEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Thiếu mã xác thực." }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      // Token bị xoá ngay khi xác thực xong, nên bấm lại link cũ cũng rơi vào đây.
      // Nói rõ cả hai khả năng để người dùng không tưởng là lỗi hệ thống.
      return NextResponse.json(
        { error: "Mã xác thực không hợp lệ hoặc đã hết hạn. Nếu bạn đã xác thực rồi, hãy đăng nhập." },
        { status: 400 }
      );
    }

    user.emailVerified = new Date();
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    user.isActive = true;
    await user.save();

    // Gửi mail chào mừng là việc phụ — hỏng cũng không được làm hỏng xác thực
    try {
      await sendWelcomeEmail(user.email!, user.name || "User");
    } catch (error) {
      console.error("Welcome email failed:", error);
    }

    return NextResponse.json({ message: "Xác thực email thành công." });
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống. Vui lòng thử lại." }, { status: 500 });
  }
}

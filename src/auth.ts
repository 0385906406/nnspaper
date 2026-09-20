import "server-only";
import NextAuth, { CredentialsSignin } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

/** Mã lỗi trả về cho UI qua `signIn(..., { redirect: false }).code`. */
class LoginError extends CredentialsSignin {
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

/** Chu kỳ đọc lại quyền của người dùng từ DB. */
const ROLE_SYNC_MS = 5 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/dang-nhap", error: "/dang-nhap" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().toLowerCase().trim() ?? "";
        const password = credentials?.password?.toString() ?? "";

        if (!email || !password) throw new LoginError("missing_credentials");

        await connectDB();

        // password có `select: false` trong schema nên phải xin thêm rõ ràng
        const user = await User.findOne({ email }).select("+password");

        // Vẫn chạy bcrypt khi không tìm thấy user để thời gian phản hồi không
        // tiết lộ email nào đã tồn tại trong hệ thống
        if (!user?.password) {
          await bcrypt.compare(password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
          throw new LoginError("invalid_credentials");
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) throw new LoginError("invalid_credentials");

        if (!user.isActive) throw new LoginError("account_disabled");
        if (!user.emailVerified) throw new LoginError("email_not_verified");

        user.lastLogin = new Date();
        await user.save();

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          // Không dùng ảnh đại diện: avatar của mọi tài khoản là nhân vật họ chọn
          image: null,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    /**
     * Google trả về profile nhưng không tạo bản ghi trong DB. Ta tự upsert để
     * mọi user đều có `_id` thật — id này là thứ RBAC và các API dùng để tra quyền.
     */
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      await connectDB();
      const email = user.email.toLowerCase();
      const existing = await User.findOne({ email });

      if (existing) {
        if (!existing.isActive) return "/dang-nhap?error=account_disabled";
        // Tài khoản mật khẩu chưa từng xác thực email thì chưa chứng minh được ai là
        // chủ email. Google đã xác thực email này, nên chủ thật là người đang đăng
        // nhập — xoá mật khẩu cũ để kẻ đăng ký trước bằng email người khác không
        // chiếm được tài khoản sau khi nó được đánh dấu đã xác thực.
        if (!existing.emailVerified) {
          existing.password = undefined;
          existing.verificationToken = undefined;
          existing.verificationTokenExpires = undefined;
        }
        existing.name ||= user.name ?? undefined;
        existing.emailVerified ??= new Date();
        existing.lastLogin = new Date();
        await existing.save();
        user.id = existing._id.toString();
        user.role = existing.role;
        return true;
      }

      const created = await User.create({
        email,
        name: user.name,
        role: "viewer",
        isActive: true,
        emailVerified: new Date(),
        lastLogin: new Date(),
      });
      user.id = created._id.toString();
      user.role = created.role;
      return true;
    },

    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        // Google gửi kèm ảnh đại diện — bỏ đi, site chỉ dùng nhân vật làm avatar
        token.picture = null;
        token.role = user.role ?? "viewer";
        token.syncedAt = Date.now();
        if (user.phone) token.phone = user.phone;
        return token;
      }

      // Đọc lại quyền/trạng thái từ DB định kỳ (và khi session được update): admin
      // đổi quyền hoặc khoá tài khoản thì giao diện đổi theo trong vài phút, không
      // phải đợi token hết hạn sau 30 ngày.
      const stale = Date.now() - (token.syncedAt ?? 0) > ROLE_SYNC_MS;
      if ((trigger === "update" || stale) && token.id) {
        try {
          await connectDB();
          const fresh = await User.findById(token.id);
          if (!fresh || !fresh.isActive) return null;
          token.role = fresh.role;
          token.name = fresh.name;
          token.picture = null;
          token.syncedAt = Date.now();
        } catch (error) {
          // DB tạm lỗi thì giữ token cũ, không đăng xuất người dùng
          console.error("[auth] Không đồng bộ được quyền:", error);
        }
      }

      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.phone = token.phone;
        session.user.role = token.role ?? "viewer";
      }
      return session;
    },
  },
});

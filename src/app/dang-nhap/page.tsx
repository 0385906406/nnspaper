import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmailLoginForm } from "@/components/email-login-form";
import { loginWithGoogle } from "./actions";
import { auth } from "@/auth";
import { absoluteUrl } from "@/lib/site";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Đăng nhập",
  alternates: { canonical: absoluteUrl("/dang-nhap") },
  robots: { index: false, follow: true },
};

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Email hoặc mật khẩu không đúng.",
  invalid_credentials: "Email hoặc mật khẩu không đúng.",
  missing_credentials: "Vui lòng nhập đầy đủ email và mật khẩu.",
  account_disabled: "Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên.",
  email_not_verified: "Tài khoản chưa xác thực email. Hãy kiểm tra hộp thư của bạn.",
  forbidden: "Tài khoản của bạn không có quyền truy cập trang quản trị.",
  OAuthAccountNotLinked: "Email này đã đăng ký bằng mật khẩu. Hãy đăng nhập bằng mật khẩu.",
  Configuration: "Đăng nhập chưa được cấu hình đúng. Vui lòng liên hệ quản trị viên.",
};

// Chỉ chấp nhận đường dẫn nội bộ; "//evil.com" cũng bắt đầu bằng "/" nên phải loại
function safeNext(value?: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export default async function LoginPage({ searchParams }: PageProps<"/dang-nhap">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  // NextAuth gửi kèm cả `error=CredentialsSignin` lẫn `code=<lý do cụ thể>`;
  // ưu tiên `code` để báo đúng "tài khoản bị khoá" thay vì "sai mật khẩu".
  const errorCode =
    (typeof sp.code === "string" ? sp.code : undefined) ??
    (typeof sp.error === "string" ? sp.error : undefined);
  const errorMessage = errorCode
    ? (ERROR_MESSAGES[errorCode] ?? "Đăng nhập không thành công. Vui lòng thử lại.")
    : undefined;

  const session = await auth();
  // Đã đăng nhập rồi thì không ở lại trang này; admin/editor về thẳng trang quản trị
  if (session?.user && !errorCode) {
    const role = session.user.role;
    const canAdmin = role === "admin" || role === "editor";
    const wantsAdmin = next === "/admin" || next.startsWith("/admin/");
    redirect(wantsAdmin && !canAdmin ? "/" : next !== "/" ? next : canAdmin ? "/admin" : "/");
  }

  return (
    <AppShell>
      <Breadcrumbs items={[{ label: "Trang chủ", href: "/" }, { label: "Đăng nhập" }]} />

      <div className="animate-fade-in-up mx-auto max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-foreground">Đăng nhập</h1>
        <p className="mb-6 text-sm text-muted">
          Đăng nhập để lưu hình nền yêu thích và truy cập tài khoản.
        </p>

        {errorMessage && (
          <p role="alert" className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
            {errorMessage}
          </p>
        )}

        {/* Email/Password Login */}
        <EmailLoginForm next={next} />

        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
          hoặc
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
        </div>

        {/* Google Login */}
        <form action={loginWithGoogle}>
          <input type="hidden" name="next" value={next} />
          <button
            type="submit"
            className="pastel-ring pastel-ring-hover flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.04 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.19a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.18-2 3.43-4.96 3.43-8.49Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.1 0 5.7-1.02 7.6-2.77l-3.71-2.9c-1.03.7-2.35 1.1-3.9 1.1-3 0-5.54-2.02-6.45-4.75H1.72v2.99A12 12 0 0 0 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.55 14.68a7.2 7.2 0 0 1 0-4.62V7.07H1.72a12 12 0 0 0 0 10.6l3.83-2.99Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.68 0 3.19.58 4.38 1.71l3.29-3.28C17.7 1.2 15.1 0 12 0A12 12 0 0 0 1.72 7.07l3.83 2.99C6.46 6.77 9 4.75 12 4.75Z"
              />
            </svg>
            Đăng nhập với Google
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Chưa có tài khoản?{" "}
          <Link href="/dang-ky" className="font-semibold text-accent hover:underline">
            Đăng ký
          </Link>
        </p>
      </div>
    </AppShell>
  );
}

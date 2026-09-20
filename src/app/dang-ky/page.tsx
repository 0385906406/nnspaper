import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SignupForm } from "@/components/signup-form";
import { auth } from "@/auth";
import { absoluteUrl } from "@/lib/site";
import { getSettings } from "@/lib/settings";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Đăng ký",
  alternates: { canonical: absoluteUrl("/dang-ky") },
  robots: { index: false, follow: true },
};

export default async function SignupPage() {
  const [session, settings] = await Promise.all([auth(), getSettings()]);
  if (session) redirect("/");

  return (
    <AppShell>
      <Breadcrumbs items={[{ label: "Trang chủ", href: "/" }, { label: "Đăng ký" }]} />

      <div className="animate-fade-in-up mx-auto max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-foreground">Đăng ký tài khoản</h1>
        <p className="mb-6 text-sm text-muted">
          Tạo tài khoản để lưu hình nền yêu thích và truy cập các tính năng khác.
        </p>

        {settings.allow_registration ? (
          <SignupForm />
        ) : (
          <p className="rounded-lg bg-surface-2 px-4 py-3 text-sm text-muted">
            Việc đăng ký tài khoản mới đang tạm khoá. Vui lòng quay lại sau.
          </p>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          Đã có tài khoản?{" "}
          <Link href="/dang-nhap" className="font-semibold text-accent hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </AppShell>
  );
}

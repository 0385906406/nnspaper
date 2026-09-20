"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function verify() {
      if (!token) {
        setError("Token không hợp lệ");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Xác nhận email thất bại");
          setLoading(false);
          return;
        }

        setSuccess(true);
        setTimeout(() => router.push("/dang-nhap"), 3000);
      } catch (err) {
        setError("Lỗi: " + String(err));
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [token, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">⚡ Xác nhận Email</h1>
        </div>

        {loading && (
          <div>
            <div className="inline-flex h-8 w-8 animate-spin rounded-full border-4 border-border border-t-accent"></div>
            <p className="mt-4 text-muted">Đang xác nhận email...</p>
          </div>
        )}

        {success && (
          <div>
            <div className="mb-4 text-4xl">✅</div>
            <p className="text-accent font-semibold mb-2">Email xác nhận thành công!</p>
            <p className="text-muted text-sm mb-6">
              Tài khoản của bạn đã được kích hoạt. Đang chuyển hướng đến trang đăng nhập...
            </p>
            <Link
              href="/dang-nhap"
              className="inline-block rounded-lg bg-accent px-6 py-2 font-semibold text-accent-foreground hover:opacity-90 transition-opacity"
            >
              Đăng nhập ngay
            </Link>
          </div>
        )}

        {error && (
          <div>
            <div className="mb-4 text-4xl">❌</div>
            <p className="text-danger font-semibold mb-2">Xác nhận thất bại</p>
            <p className="text-muted text-sm mb-6">{error}</p>
            <Link
              href="/dang-ky"
              className="inline-block rounded-lg bg-accent px-6 py-2 font-semibold text-accent-foreground hover:opacity-90 transition-opacity"
            >
              Đăng ký lại
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

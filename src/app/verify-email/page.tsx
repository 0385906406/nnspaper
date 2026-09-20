import { Suspense } from "react";
import type { Metadata } from "next";
import { VerifyEmailClient } from "./verify-email-client";

export const metadata: Metadata = {
  title: "Xác nhận email",
  robots: { index: false, follow: false },
};

// useSearchParams() ở client component bắt buộc có Suspense bao ngoài, nếu không
// `next build` dừng khi prerender trang này.
export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background text-muted">
          Đang xác nhận email...
        </div>
      }
    >
      <VerifyEmailClient />
    </Suspense>
  );
}

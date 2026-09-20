import Link from "next/link";
import { AppShell } from "@/components/app-shell";

// AppShell tải category từ DB -> không thể build tĩnh lúc build time.
export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <p className="text-6xl">🖼️</p>
        <h1 className="text-xl font-bold text-foreground">Không tìm thấy trang này</h1>
        <p className="text-sm text-muted">Hình nền hoặc trang bạn tìm có thể đã bị xoá hoặc chưa từng tồn tại.</p>
        <Link
          href="/"
          className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          Về trang chủ
        </Link>
      </div>
    </AppShell>
  );
}

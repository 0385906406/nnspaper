import Link from "next/link";

/** Trang khách nhìn thấy khi admin bật chế độ bảo trì. */
export function MaintenanceScreen({
  siteName,
  message,
}: {
  siteName: string;
  message: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-center">
      <span className="pastel-flow pastel-glow mb-6 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl">
        🛠️
      </span>

      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{siteName}</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{message}</p>

      <Link
        href="/dang-nhap"
        className="mt-8 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent/50 hover:text-foreground"
      >
        Đăng nhập quản trị
      </Link>
    </div>
  );
}

import Link from "next/link";
import { signOut } from "@/auth";
import { AdminMobileNav } from "@/components/admin/admin-sidebar";

const ROLE_LABELS: Record<string, string> = {
  admin: "Quản trị viên",
  editor: "Biên tập viên",
  viewer: "Người xem",
};

export function AdminHeader({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: string;
}) {
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <header className="shrink-0 border-b border-border bg-surface px-4 py-3 sm:px-6 lg:py-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <AdminMobileNav />
          <p className="truncate text-lg font-bold text-foreground sm:text-2xl">Admin Dashboard</p>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-foreground">{name}</p>
            <p className="text-xs text-muted">
              {ROLE_LABELS[role] ?? role}
              {email ? ` · ${email}` : ""}
            </p>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg bg-accent/10 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/20 transition-colors"
            >
              Đăng xuất
            </button>
          </form>

          <Link
            href="/"
            className="hidden rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground sm:block"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </header>
  );
}

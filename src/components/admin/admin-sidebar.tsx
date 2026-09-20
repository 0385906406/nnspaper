"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Icon để riêng ở `icon`, không nhét vào `label` — nhét cả hai sẽ ra hai icon
const MENU_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: "📊" },
  { label: "Người dùng", href: "/admin/users", icon: "👥" },
  { label: "Danh mục", href: "/admin/categories", icon: "📁" },
  { label: "Hình nền", href: "/admin/wallpapers", icon: "🖼️" },
  { label: "Bình luận", href: "/admin/comments", icon: "💬" },
  { label: "Tìm kiếm", href: "/admin/search", icon: "🔎" },
  { label: "Vai trò", href: "/admin/roles", icon: "👤" },
  { label: "Cài đặt", href: "/admin/settings", icon: "⚙️" },
  { label: "Audit Log", href: "/admin/audit-logs", icon: "📋" },
];

function isActive(pathname: string, href: string) {
  // Trang con (vd /admin/users/create) vẫn phải sáng mục cha; riêng "/admin"
  // thì so khớp tuyệt đối vì nó là tiền tố của mọi mục khác.
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function MenuLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-2">
      {MENU_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isActive(pathname, item.href)
              ? "bg-accent text-accent-foreground"
              : "text-muted hover:bg-surface hover:text-foreground"
          }`}
        >
          <span>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** Nút menu + ngăn trượt cho màn hình nhỏ, nơi sidebar cố định bị ẩn. */
export function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Mở menu quản trị"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground hover:bg-surface-2"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
          <path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu quản trị">
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={() => setOpen(false)}
            className="animate-fade-in absolute inset-0 bg-black/60"
          />
          <aside className="animate-fade-in relative flex h-full w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto border-r border-border bg-surface-2 px-5 py-6">
            <div className="flex items-center justify-between">
              <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 text-lg font-bold">
                <span className="text-2xl">⚡</span>
                Admin Panel
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng menu"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <MenuLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="mt-auto rounded-lg border border-border px-3 py-2 text-center text-sm font-medium text-muted hover:text-foreground"
            >
              Về trang chủ
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    // shrink-0 để sidebar không bị bảng rộng bên phải bóp lại
    <aside className="hidden h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-surface-2 px-6 py-6 lg:flex">
      {/* Logo */}
      <Link href="/admin" className="flex items-center gap-2 font-bold text-lg">
        <span className="text-2xl">⚡</span>
        Admin Panel
      </Link>

      {/* Navigation */}
      <MenuLinks pathname={pathname} />

      {/* Footer */}
      <div className="mt-auto border-t border-border pt-6 text-xs text-muted">
        <p>© {new Date().getFullYear()} Admin System</p>
      </div>
    </aside>
  );
}

"use client";

import { useEffect, useId, useRef, useState, type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { NO_MASCOT, avatarMascot, mascotName } from "@/lib/mascots";
import { MascotAvatar } from "@/components/mascot-avatar";
import {
  ChevronDownIcon,
  HeartIcon,
  LogoutIcon,
  ShieldIcon,
  SparkleIcon,
  UserIcon,
} from "@/components/icons";

const ROLE_BADGES: Record<string, { label: string; className: string }> = {
  admin: { label: "Quản trị viên", className: "bg-pin/15 text-pin" },
  editor: { label: "Biên tập viên", className: "bg-accent/15 text-accent" },
  viewer: { label: "Thành viên", className: "bg-foreground/10 text-muted" },
};

function MenuItem({
  href,
  icon: Icon,
  label,
  hint,
  onSelect,
  accent,
}: {
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  hint?: string;
  onSelect: () => void;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onSelect}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
          accent
            ? "bg-pin/15 text-pin"
            : "bg-surface-2 text-muted group-hover:bg-background group-hover:text-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-foreground">{label}</span>
        {hint && <span className="block truncate text-xs text-muted">{hint}</span>}
      </span>
    </Link>
  );
}

/** Nút tài khoản ở header: avatar + menu thả xuống. Khách thấy nút Đăng nhập. */
export function UserMenu({ session, mascot }: { session: Session | null; mascot: string }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!session?.user) {
    const next = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/dang-ky"
          className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2 md:block"
        >
          Đăng ký
        </Link>
        <Link
          href={`/dang-nhap${next}`}
          className="rounded-full bg-pin px-4 py-2.5 text-sm font-bold whitespace-nowrap text-white shadow-lg shadow-pin/20 transition-colors hover:bg-pin-strong"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  const { name, email, role } = session.user;
  const displayName = name || email?.split("@")[0] || "Bạn";
  const badge = ROLE_BADGES[role ?? "viewer"] ?? ROLE_BADGES.viewer;
  const canOpenAdmin = role === "admin" || role === "editor";
  // Avatar luôn là nhân vật; đang "ẩn nhân vật" thì avatar dùng nhân vật mặc định
  const hasMascot = mascot !== NO_MASCOT;
  const avatar = avatarMascot(mascot);
  const close = () => setOpen(false);

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Tài khoản của ${displayName}`}
        className={`group flex items-center gap-2 rounded-full p-1 transition-colors sm:pr-3 ${
          open ? "bg-surface-2" : "hover:bg-surface-2"
        }`}
      >
        <span className="relative">
          {/* Viền gradient quanh avatar nhân vật + chấm "đang hoạt động" */}
          <span className="pastel-flow block rounded-full p-[2px]">
            <span className="block rounded-full bg-background p-[2px]">
              <MascotAvatar mascot={avatar} ring={false} className="block h-8 w-8 sm:h-9 sm:w-9" />
            </span>
          </span>
          <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-background" />
        </span>
        <span className="hidden max-w-[120px] truncate text-sm font-semibold text-foreground sm:block">
          {displayName}
        </span>
        <ChevronDownIcon
          className={`hidden h-4 w-4 text-muted transition-transform duration-200 sm:block ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Menu tài khoản"
          className="animate-scale-in absolute top-full right-0 z-50 mt-2 w-[min(19rem,calc(100vw-1.5rem))] origin-top-right overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/60"
        >
          {/* Thẻ đầu: ảnh bìa gradient + thông tin tài khoản */}
          <div className="relative">
            <div className="pastel-flow h-16 opacity-70" aria-hidden="true" />
            <div className="-mt-8 px-4 pb-4">
              <div className="flex items-end justify-between">
                <span className="rounded-full bg-surface p-1">
                  <MascotAvatar mascot={avatar} className="block h-16 w-16" label={`Nhân vật ${mascotName(avatar)}`} />
                </span>
                <Link
                  href="/profile#nhan-vat"
                  role="menuitem"
                  onClick={close}
                  className="mb-1 rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-foreground/30"
                >
                  Đổi nhân vật
                </Link>
              </div>
              <p className="mt-2 truncate text-base font-bold text-foreground">{displayName}</p>
              {email && <p className="truncate text-xs text-muted">{email}</p>}
              <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
                {badge.label}
              </span>
            </div>
          </div>

          <div className="border-t border-border p-2">
            <MenuItem href="/profile" icon={UserIcon} label="Thông tin cá nhân" hint="Tài khoản và bảo mật" onSelect={close} />
            <MenuItem href="/yeu-thich" icon={HeartIcon} label="Hình nền yêu thích" hint="Những ảnh bạn đã lưu" onSelect={close} />
            <MenuItem
              href="/profile#nhan-vat"
              icon={SparkleIcon}
              label="Nhân vật của tôi"
              hint={
                hasMascot
                  ? `Đang dùng: ${mascotName(mascot)}`
                  : `Đang ẩn ở thanh bên · avatar: ${mascotName(avatar)}`
              }
              onSelect={close}
            />
            {canOpenAdmin && (
              <MenuItem href="/admin" icon={ShieldIcon} label="Trang quản trị" hint="Nội dung, người dùng, bình luận" onSelect={close} accent />
            )}
          </div>

          <div className="border-t border-border p-2">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                signOut({ redirectTo: "/" });
              }}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/10 focus-visible:bg-danger/10 focus-visible:outline-none"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger/10">
                <LogoutIcon className="h-4 w-4" />
              </span>
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

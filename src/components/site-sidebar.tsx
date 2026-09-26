"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildCategoryTree, type CategoryView } from "@/lib/category-tree";
import { Mascot } from "page-mascot";
import { MascotPickerDialog } from "@/components/mascot-picker";
import { NO_MASCOT, mascotName, mascotSheets } from "@/lib/mascots";
import { SiteLogo } from "@/components/site-logo";
import { Copyright } from "@/components/site-footer";
import {
  CloseIcon,
  FlameIcon,
  GridIcon,
  HeartIcon,
  HomeIcon,
  InfoIcon,
  MonitorIcon,
  PhoneIcon,
  PlayIcon,
  ShieldIcon,
  UserIcon,
} from "@/components/icons";

type NavLink = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  exact?: boolean;
};

const MAIN_LINKS: NavLink[] = [
  { href: "/", label: "Trang chủ", icon: HomeIcon, exact: true },
  { href: "/thinh-hanh", label: "Thịnh hành", icon: FlameIcon },
  { href: "/hinh-nen-dong", label: "Video nền", icon: PlayIcon },
  { href: "/hinh-nen-may-tinh", label: "Hình nền máy tính", icon: MonitorIcon },
  { href: "/hinh-nen-dien-thoai", label: "Hình nền điện thoại", icon: PhoneIcon },
];

const INFO_LINKS = [
  { href: "/gioi-thieu", label: "Về chúng tôi" },
  { href: "/cau-hoi-thuong-gap", label: "Câu hỏi thường gặp" },
  { href: "/lien-he", label: "Liên hệ" },
  { href: "/chinh-sach-bao-mat", label: "Chính sách bảo mật" },
  { href: "/dieu-khoan-su-dung", label: "Điều khoản sử dụng" },
  { href: "/mien-tru-trach-nhiem", label: "Miễn trừ trách nhiệm" },
];

type Panel = "categories" | "info" | null;

type Props = {
  categories: CategoryView[];
  siteName: string;
  logoMode: "text" | "image";
  logoText: string;
  logoImage: string;
  loggedIn: boolean;
  canOpenAdmin: boolean;
  /** Nhân vật đang dùng (slug) hoặc "none". Khách luôn nhận nhân vật mặc định. */
  mascot: string;
};

const TEASERS = [
  "Psst… mình còn 56 người bạn nữa đó 👀",
  "Muốn đổi mình thành gấu trúc không? 🐼",
  "Đăng nhập là chọn được bạn đồng hành riêng ✨",
  "Chạm thử vào mình xem nào! 🦊",
];
const TEASER_DISMISS_KEY = "mascot-teaser-dismissed";
// Lần hiện gần nhất + câu đã nói, lưu theo phiên để chuyển trang không làm bong bóng hiện lại ngay
const TEASER_LAST_KEY = "mascot-teaser-last";
const TEASER_INDEX_KEY = "mascot-teaser-index";
const TEASER_FIRST_DELAY_MS = 4_000;
const TEASER_VISIBLE_MS = 6_000;
const TEASER_GAP_MS = 30_000;

function readStorage(storage: "localStorage" | "sessionStorage", key: string): string | null {
  try {
    return window[storage].getItem(key);
  } catch {
    // Bị chặn (ẩn danh, chặn cookie) — coi như chưa có gì
    return null;
  }
}

function writeStorage(storage: "localStorage" | "sessionStorage", key: string, value: string) {
  try {
    window[storage].setItem(key, value);
  } catch {
    // bỏ qua nếu không lưu được
  }
}

/**
 * Bong bóng lời thoại cạnh linh vật, chỉ cho khách: gợi tò mò để đăng nhập chọn
 * nhân vật. Thỉnh thoảng mới ló ra — hiện một câu vài giây rồi ẩn, nghỉ một lúc
 * mới nói câu tiếp theo. Tắt được và nhớ trong trình duyệt.
 */
function GuestTeaser({ loginHref }: { loginHref: string }) {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const hoveredRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (readStorage("localStorage", TEASER_DISMISS_KEY) === "1") return;

    const schedule = (ms: number, fn: () => void) => {
      timerRef.current = window.setTimeout(fn, ms);
    };

    const hide = () => {
      // Đang rê chuột vào thì chờ người ta đọc xong
      if (hoveredRef.current) return schedule(1_000, hide);
      setVisible(false);
      schedule(TEASER_GAP_MS, show);
    };

    const show = () => {
      const next = (Number(readStorage("sessionStorage", TEASER_INDEX_KEY) ?? -1) + 1) % TEASERS.length;
      writeStorage("sessionStorage", TEASER_INDEX_KEY, String(next));
      writeStorage("sessionStorage", TEASER_LAST_KEY, String(Date.now()));
      setIndex(next);
      setVisible(true);
      schedule(TEASER_VISIBLE_MS, hide);
    };

    const last = Number(readStorage("sessionStorage", TEASER_LAST_KEY) ?? 0);
    const due = last ? last + TEASER_VISIBLE_MS + TEASER_GAP_MS - Date.now() : 0;
    schedule(Math.max(TEASER_FIRST_DELAY_MS, due), show);

    return () => window.clearTimeout(timerRef.current);
  }, []);

  if (!visible) return null;

  function dismiss() {
    window.clearTimeout(timerRef.current);
    setVisible(false);
    writeStorage("localStorage", TEASER_DISMISS_KEY, "1");
  }

  return (
    <div
      className="teaser-pop absolute top-1/2 left-full z-50 ml-4 -translate-y-1/2"
      onMouseEnter={() => (hoveredRef.current = true)}
      onMouseLeave={() => (hoveredRef.current = false)}
    >
      <div className="teaser-float relative flex items-center gap-2 rounded-full border border-white/70 bg-white/85 py-2 pr-2 pl-4 shadow-xl shadow-black/40 backdrop-blur-md">
        {/* Đuôi bong bóng chỉ vào nhân vật */}
        <span
          aria-hidden="true"
          className="absolute top-1/2 -left-[7px] h-3.5 w-3.5 -translate-y-1/2 rotate-45 border-b border-l border-white/70 bg-white/85"
        />
        <Link
          href={loginHref}
          aria-live="polite"
          className="relative text-[13px] font-semibold whitespace-nowrap text-neutral-900 hover:underline"
        >
          <span key={index} className="animate-fade-in inline-block">
            {TEASERS[index]}
          </span>
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Ẩn lời nhắn"
          className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs text-neutral-500 hover:bg-black/10 hover:text-neutral-900"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/**
 * Linh vật ở cuối thanh dọc: nhìn theo con trỏ, bấm vào thì đổi biểu cảm.
 * Nút nhỏ bên cạnh mở hộp chọn nhân vật (khách thì được mời đăng nhập).
 */
function RailMascot({ mascot, loggedIn }: { mascot: string; loggedIn: boolean }) {
  const pathname = usePathname() ?? "/";
  const [picking, setPicking] = useState(false);
  const hidden = mascot === NO_MASCOT;
  const editClass =
    "flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-[11px] text-foreground shadow transition-colors hover:bg-surface-2";

  const editButton = loggedIn ? (
    <button type="button" onClick={() => setPicking(true)} aria-label="Đổi nhân vật" title="Đổi nhân vật" className={editClass}>
      {hidden ? "🙂" : "✎"}
    </button>
  ) : (
    <Link
      href={`/dang-nhap?next=${encodeURIComponent(pathname)}`}
      aria-label="Đăng nhập để chọn nhân vật"
      title="Đăng nhập để chọn nhân vật của riêng bạn"
      className={editClass}
    >
      ✎
    </Link>
  );

  return (
    <div className="group/mascot relative mb-1">
      {hidden ? (
        editButton
      ) : (
        <>
          <Mascot key={mascot} {...mascotSheets(mascot)} size={60} label={mascotName(mascot)} />
          <div className="absolute -top-1 -right-2 opacity-0 transition-opacity group-hover/mascot:opacity-100 focus-within:opacity-100">
            {editButton}
          </div>
        </>
      )}
      {!loggedIn && !hidden && <GuestTeaser loginHref={`/dang-nhap?next=${encodeURIComponent(pathname)}`} />}
      {picking && <MascotPickerDialog value={mascot} onClose={() => setPicking(false)} />}
    </div>
  );
}

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** Nút tròn trên thanh dọc, nhãn hiện dạng tooltip khi rê chuột. */
function RailButton({
  label,
  active,
  children,
  ...rest
}: {
  label: string;
  active?: boolean;
  children: ReactNode;
} & ({ href: string; onClick?: undefined } | { href?: undefined; onClick: () => void })) {
  const className = `flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
    active ? "bg-foreground text-background" : "text-foreground hover:bg-surface-2"
  }`;

  return (
    <div className="group relative">
      {rest.href ? (
        <Link href={rest.href} aria-label={label} aria-current={active ? "page" : undefined} className={className}>
          {children}
        </Link>
      ) : (
        <button type="button" aria-label={label} aria-expanded={active} onClick={rest.onClick} className={className}>
          {children}
        </button>
      )}
      <span
        role="tooltip"
        className="pointer-events-none absolute top-1/2 left-full z-50 ml-3 -translate-y-1/2 rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
      >
        {label}
      </span>
    </div>
  );
}

function CategoryPanel({ categories, onNavigate }: { categories: CategoryView[]; onNavigate: () => void }) {
  const pathname = usePathname();
  return (
    <div className="space-y-1">
      {buildCategoryTree(categories).map((root) => (
        <div key={root.slug}>
          <Link
            href={`/danh-muc/${root.slug}`}
            onClick={onNavigate}
            className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              pathname === `/danh-muc/${root.slug}` ? "bg-surface-2 text-foreground" : "text-foreground hover:bg-surface-2"
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-base" aria-hidden="true">
              {root.icon || "🖼️"}
            </span>
            <span className="truncate">{root.name}</span>
          </Link>
          {root.children.length > 0 && (
            <div className="mt-0.5 mb-1 ml-[3.25rem] flex flex-wrap gap-1">
              {root.children.map((child) => (
                <Link
                  key={child.slug}
                  href={`/danh-muc/${child.slug}`}
                  onClick={onNavigate}
                  className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                    pathname === `/danh-muc/${child.slug}`
                      ? "bg-foreground text-background"
                      : "bg-surface-2 text-muted hover:text-foreground"
                  }`}
                >
                  {child.icon ? `${child.icon} ` : ""}
                  {child.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function InfoPanel({ onNavigate, siteName }: { onNavigate: () => void; siteName: string }) {
  return (
    <div className="space-y-1">
      {INFO_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={onNavigate}
          className="block rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
        >
          {link.label}
        </Link>
      ))}
      <p className="px-3 pt-4 text-xs text-muted">
        <Copyright siteName={siteName} />
      </p>
    </div>
  );
}

/**
 * Điều hướng chính kiểu Pinterest.
 * Desktop: thanh icon dọc cố định bên trái, danh mục/thông tin mở dạng ngăn trượt.
 * Mobile: thanh tab cố định dưới đáy màn hình.
 */
export function SiteSidebar({
  categories,
  siteName,
  logoMode,
  logoText,
  logoImage,
  loggedIn,
  canOpenAdmin,
  mascot,
}: Props) {
  const pathname = usePathname() ?? "/";
  const [panel, setPanel] = useState<Panel>(null);
  const [openedAt, setOpenedAt] = useState(pathname);

  // Đổi trang thì đóng ngăn trượt (điều chỉnh state ngay lúc render, không cần effect)
  if (openedAt !== pathname) {
    setOpenedAt(pathname);
    setPanel(null);
  }

  useEffect(() => {
    if (!panel) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPanel(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [panel]);

  const toggle = (next: Exclude<Panel, null>) => setPanel((p) => (p === next ? null : next));
  const close = () => setPanel(null);
  const categoryActive = panel === "categories" || pathname.startsWith("/danh-muc/");

  return (
    <>
      {/* Desktop: thanh dọc */}
      <nav
        aria-label="Điều hướng chính"
        className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col items-center gap-2 border-r border-border bg-background py-4 lg:flex"
      >
        <Link href="/" aria-label={siteName} className="group mb-3 flex h-12 w-12 items-center justify-center">
          <SiteLogo mode={logoMode} text={logoText} image={logoImage} siteName={siteName} interactive />
        </Link>

        {MAIN_LINKS.map(({ href, label, icon: Icon, exact }) => (
          <RailButton key={href} href={href} label={label} active={!panel && isActive(pathname, href, exact)}>
            <Icon className="h-6 w-6" />
          </RailButton>
        ))}

        <RailButton label="Danh mục" active={categoryActive} onClick={() => toggle("categories")}>
          <GridIcon className="h-6 w-6" />
        </RailButton>

        <RailButton href="/yeu-thich" label="Yêu thích" active={!panel && isActive(pathname, "/yeu-thich")}>
          <HeartIcon className="h-6 w-6" />
        </RailButton>

        <div className="mt-auto flex flex-col items-center gap-2">
          <RailMascot mascot={mascot} loggedIn={loggedIn} />
          {canOpenAdmin && (
            <RailButton href="/admin" label="Trang quản trị">
              <ShieldIcon className="h-6 w-6" />
            </RailButton>
          )}
          <RailButton label="Thông tin" active={panel === "info"} onClick={() => toggle("info")}>
            <InfoIcon className="h-6 w-6" />
          </RailButton>
        </div>
      </nav>

      {/* Ngăn trượt danh mục / thông tin */}
      {panel && (
        <>
          <button
            type="button"
            aria-label="Đóng"
            onClick={close}
            className="animate-fade-in fixed inset-0 z-40 bg-black/50 lg:left-[72px]"
          />
          <aside
            className="animate-fade-in-up fixed inset-x-0 bottom-0 z-50 max-h-[75dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-surface p-4 pb-24 shadow-2xl lg:inset-x-auto lg:top-0 lg:bottom-0 lg:left-[72px] lg:max-h-none lg:w-80 lg:rounded-none lg:rounded-r-3xl lg:border-t-0 lg:border-r lg:pb-4"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-lg font-bold text-foreground">
                {panel === "categories" ? "Danh mục" : "Thông tin"}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Đóng"
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-2"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            {panel === "categories" ? (
              <CategoryPanel categories={categories} onNavigate={close} />
            ) : (
              <InfoPanel onNavigate={close} siteName={siteName} />
            )}
          </aside>
        </>
      )}

      {/* Mobile: thanh tab dưới đáy */}
      <nav
        aria-label="Điều hướng chính"
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-background/95 px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] backdrop-blur short:pt-1 short:pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] lg:hidden"
      >
        {[
          { href: "/", label: "Trang chủ", icon: HomeIcon, exact: true },
          { href: "/thinh-hanh", label: "Thịnh hành", icon: FlameIcon },
        ].map(({ href, label, icon: Icon, exact }) => (
          <MobileTab key={href} href={href} label={label} active={!panel && isActive(pathname, href, exact)}>
            <Icon className="h-6 w-6" />
          </MobileTab>
        ))}
        <MobileTab label="Danh mục" active={categoryActive} onClick={() => toggle("categories")}>
          <GridIcon className="h-6 w-6" />
        </MobileTab>
        <MobileTab href="/yeu-thich" label="Yêu thích" active={!panel && isActive(pathname, "/yeu-thich")}>
          <HeartIcon className="h-6 w-6" />
        </MobileTab>
        <MobileTab
          href={loggedIn ? "/profile" : "/dang-nhap"}
          label={loggedIn ? "Tài khoản" : "Đăng nhập"}
          active={!panel && (isActive(pathname, "/profile") || isActive(pathname, "/dang-nhap"))}
        >
          <UserIcon className="h-6 w-6" />
        </MobileTab>
      </nav>
    </>
  );
}

function MobileTab({
  label,
  active,
  children,
  href,
  onClick,
}: {
  label: string;
  active?: boolean;
  children: ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const className = `flex min-w-14 flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
    active ? "text-foreground" : "text-muted"
  }`;
  const content = (
    <>
      <span className={`flex h-8 w-11 items-center justify-center rounded-full ${active ? "bg-surface-2" : ""}`}>
        {children}
      </span>
      <span className="short:hidden">{label}</span>
    </>
  );

  return href ? (
    <Link href={href} aria-current={active ? "page" : undefined} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-expanded={active} className={className}>
      {content}
    </button>
  );
}

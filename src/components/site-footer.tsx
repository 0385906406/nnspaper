import Link from "next/link";
import { siteConfig } from "@/lib/site";

const LINKS = [
  { href: "/gioi-thieu", label: "Về chúng tôi" },
  { href: "/cau-hoi-thuong-gap", label: "Câu hỏi thường gặp" },
  { href: "/lien-he", label: "Liên hệ" },
  { href: "/chinh-sach-bao-mat", label: "Chính sách bảo mật" },
  { href: "/dieu-khoan-su-dung", label: "Điều khoản" },
  { href: "/mien-tru-trach-nhiem", label: "Miễn trừ trách nhiệm" },
];

/** Dòng bản quyền kèm tên chủ web — dùng chung cho chân trang và bảng menu mobile. */
export function Copyright({ siteName }: { siteName: string }) {
  return (
    <>
      © {new Date().getFullYear()} {siteName} · Thực hiện với{" "}
      <span className="animate-pulse-soft inline-block text-pin" aria-label="tình yêu">
        ♥
      </span>{" "}
      bởi{" "}
      <span className="pastel-text font-bold whitespace-nowrap drop-shadow-[0_0_6px_rgba(203,163,255,0.45)]">
        {siteConfig.author.name}
      </span>
    </>
  );
}

/**
 * Chân trang gọn một dòng. Danh mục và các trang khám phá đã nằm ở thanh điều
 * hướng dọc nên không lặp lại ở đây; chỉ giữ link thông tin (cần cho SEO/pháp lý).
 */
export function SiteFooter({ siteName, siteDescription }: { siteName: string; siteDescription: string }) {
  return (
    <footer className="border-t border-border px-4 py-5 text-xs text-muted lg:px-6">
      <p className="sr-only">{siteDescription}</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <Copyright siteName={siteName} />
        </p>
        <nav aria-label="Thông tin" className="flex flex-wrap gap-x-4 gap-y-1.5">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

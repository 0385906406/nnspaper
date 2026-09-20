import Link from "next/link";

const LINKS = [
  { href: "/gioi-thieu", label: "Về chúng tôi" },
  { href: "/cau-hoi-thuong-gap", label: "Câu hỏi thường gặp" },
  { href: "/lien-he", label: "Liên hệ" },
  { href: "/chinh-sach-bao-mat", label: "Chính sách bảo mật" },
  { href: "/dieu-khoan-su-dung", label: "Điều khoản" },
  { href: "/mien-tru-trach-nhiem", label: "Miễn trừ trách nhiệm" },
];

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
          © {new Date().getFullYear()} {siteName}. Đã lưu giữ mọi quyền.
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

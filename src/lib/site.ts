/**
 * Cấu hình SEO tập trung của toàn site.
 * Sửa thông tin ở đây là metadata, sitemap, robots, JSON-LD đều đổi theo.
 */

/**
 * URL gốc của site.
 *
 * Mọi canonical, og:url, JSON-LD và sitemap đều sinh từ đây. Nếu build production
 * mà thiếu NEXT_PUBLIC_SITE_URL thì cả site khai canonical về localhost và Google
 * bỏ qua toàn bộ trang. Lỗi đó im lặng, chỉ phát hiện sau khi đã index, nên chặn
 * ngay lúc build thay vì âm thầm rơi về giá trị mặc định.
 */
function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Thiếu NEXT_PUBLIC_SITE_URL. Đặt domain thật (vd. https://nnspaper.com) trước khi build " +
        "production, nếu không toàn bộ canonical/og:url/sitemap sẽ trỏ về localhost."
    );
  }

  return "http://localhost:3000";
}

const SITE_URL = resolveSiteUrl();

export const siteConfig = {
  name: "nnspaper",
  shortName: "nns",
  description:
    "Kho hình nền và video nền (live wallpaper) 4K miễn phí cho điện thoại và máy tính, phân loại theo chủ đề: Anime, Game, Phong cảnh, Dark/Creepy và nhiều hơn nữa.",
  locale: "vi_VN",
  lang: "vi",
  url: SITE_URL,
  twitter: "@nnspaper",
  contactEmail: "hello@your-domain.com",
  author: {
    name: "Nguyễn Đình Ngọc Sơn",
    url: SITE_URL,
  },
  keywords: [
    "hình nền 4k",
    "hình nền động",
    "live wallpaper",
    "hình nền điện thoại",
    "hình nền máy tính",
    "wallpaper anime",
    "wallpaper game",
    "tải hình nền miễn phí",
  ],
} as const;

/** Ghép đường dẫn tương đối thành URL tuyệt đối (metadata và JSON-LD bắt buộc dùng URL tuyệt đối). */
export function absoluteUrl(path = "/"): string {
  const base = siteConfig.url.replace(/\/$/, "");
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}

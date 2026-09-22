import "server-only";
import type { Metadata } from "next";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { withDb } from "@/lib/data-source";
import { SystemSettings } from "@/models/SystemSettings";

/**
 * Nguồn sự thật duy nhất cho cài đặt hệ thống.
 *
 * Mỗi mục ở đây phải thực sự điều khiển một hành vi có thật của site. Cài đặt
 * chỉ nằm trong DB mà không ai đọc sẽ khiến admin tưởng đã đổi được thứ gì đó
 * trong khi ngoài trang không có gì thay đổi.
 */
export const SETTING_DEFS = [
  {
    key: "site_name",
    value: "nnspaper",
    type: "string" as const,
    category: "site" as const,
    description: "Tên trang web",
    help: "Hiện ở logo đầu trang, chân trang, tiêu đề tab và dữ liệu SEO.",
  },
  {
    key: "site_logo_mode",
    value: "text",
    type: "string" as const,
    category: "branding" as const,
    description: "Kiểu logo",
    help: "Chọn hiển thị bằng chữ hay bằng ảnh.",
  },
  {
    key: "site_logo_text",
    value: "nns",
    type: "string" as const,
    category: "branding" as const,
    description: "Chữ trên logo",
    help: "Hiện nguyên văn trong ô logo vuông. Để ngắn (1–4 ký tự) thì cân đối nhất.",
  },
  {
    key: "site_logo_image",
    value: "",
    type: "url" as const,
    category: "branding" as const,
    description: "Ảnh logo",
    help: "Chọn file từ máy hoặc dán URL. Nên dùng ảnh vuông, nền trong suốt.",
  },
  {
    key: "site_favicon",
    value: "",
    type: "url" as const,
    category: "branding" as const,
    description: "Favicon",
    help: "Biểu tượng nhỏ trên tab trình duyệt. Ảnh vuông 32–512px, png hoặc svg.",
  },
  {
    key: "site_description",
    value:
      "Kho hình nền và video nền (live wallpaper) 4K miễn phí cho điện thoại và máy tính, phân loại theo chủ đề: Anime, Game, Phong cảnh, Dark/Creepy và nhiều hơn nữa.",
    type: "string" as const,
    category: "site" as const,
    description: "Mô tả trang web",
    help: "Dùng cho thẻ meta description, chia sẻ mạng xã hội và đoạn giới thiệu ở chân trang.",
  },
  {
    key: "site_keywords",
    value: [
      "hình nền 4k",
      "hình nền động",
      "live wallpaper",
      "hình nền điện thoại",
      "hình nền máy tính",
    ],
    type: "json" as const,
    category: "site" as const,
    description: "Từ khoá SEO",
    help: "Mảng chuỗi, đưa vào thẻ meta keywords.",
  },
  {
    key: "contact_email",
    value: "hello@your-domain.com",
    type: "email" as const,
    category: "site" as const,
    description: "Email liên hệ",
    help: "Hiện ở trang Liên hệ để người dùng góp ý hoặc yêu cầu gỡ ảnh.",
  },
  {
    key: "wallpapers_per_page",
    value: 8,
    type: "number" as const,
    category: "display" as const,
    description: "Số hình nền mỗi trang",
    help: "Áp dụng cho trang chủ, trang chủ đề và trang thịnh hành.",
  },
  {
    key: "allow_registration",
    value: true,
    type: "boolean" as const,
    category: "system" as const,
    description: "Cho phép đăng ký tài khoản",
    help: "Tắt thì trang đăng ký báo tạm khoá và API đăng ký từ chối yêu cầu mới.",
  },
  {
    key: "comments_enabled",
    value: true,
    type: "boolean" as const,
    category: "system" as const,
    description: "Cho phép bình luận",
    help: "Tắt thì toàn bộ trang chi tiết ngừng nhận bình luận mới (bình luận cũ vẫn hiện).",
  },
  {
    key: "maintenance_mode",
    value: false,
    type: "boolean" as const,
    category: "system" as const,
    description: "Chế độ bảo trì",
    help: "Bật thì khách chỉ thấy trang thông báo bảo trì. Quản trị viên vẫn vào bình thường.",
  },
  {
    key: "maintenance_message",
    value: "Trang đang được bảo trì để nâng cấp. Vui lòng quay lại sau ít phút.",
    type: "string" as const,
    category: "system" as const,
    description: "Nội dung trang bảo trì",
    help: "Câu thông báo hiển thị cho khách khi bật chế độ bảo trì.",
  },
] as const;

export type SettingKey = (typeof SETTING_DEFS)[number]["key"];

export type LogoMode = "text" | "image";

export type SiteSettings = {
  site_name: string;
  site_logo_mode: LogoMode;
  site_logo_text: string;
  site_logo_image: string;
  site_favicon: string;
  site_description: string;
  site_keywords: string[];
  contact_email: string;
  wallpapers_per_page: number;
  allow_registration: boolean;
  comments_enabled: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
};

const DEFAULTS = Object.fromEntries(
  SETTING_DEFS.map((d) => [d.key, d.value])
) as unknown as SiteSettings;

export const SETTING_CATEGORIES: Record<string, string> = {
  site: "Trang web",
  branding: "Thương hiệu",
  display: "Hiển thị",
  system: "Hệ thống",
};

/** Ảnh logo bị xoá mà vẫn để kiểu "image" thì logo sẽ trống — tự lùi về chữ. */
export function resolveLogoMode(settings: SiteSettings): LogoMode {
  return settings.site_logo_mode === "image" && settings.site_logo_image ? "image" : "text";
}

/** Ép giá trị đọc từ DB về đúng kiểu đã khai báo; sai kiểu thì rơi về mặc định. */
function coerce(def: (typeof SETTING_DEFS)[number], raw: unknown): unknown {
  if (raw === undefined || raw === null) return def.value;

  switch (def.type) {
    case "number": {
      const n = Number(raw);
      return Number.isFinite(n) ? n : def.value;
    }
    case "boolean":
      return typeof raw === "boolean" ? raw : raw === "true";
    case "json":
      return Array.isArray(raw) ? raw : def.value;
    default:
      return typeof raw === "string" ? raw : String(raw);
  }
}

/**
 * Tag để xoá cache settings khi admin lưu thay đổi (xem route /api/admin/settings).
 */
export const SETTINGS_CACHE_TAG = "site-settings";

/**
 * Đọc settings từ DB, có cache liên request.
 *
 * Root layout gọi getSettings() nên nếu không cache thì MỌI request — kể cả các
 * trang tĩnh như /gioi-thieu — đều phải đi một vòng MongoDB trước khi trả HTML.
 * `unstable_cache` giữ kết quả lại giữa các request; admin lưu cài đặt thì route
 * gọi revalidateTag(SETTINGS_CACHE_TAG) nên thay đổi vẫn có hiệu lực ngay.
 */
const loadSettings = unstable_cache(
  async (): Promise<SiteSettings> =>
    withDb(
      async () => {
        const docs = await SystemSettings.find().lean();
        const stored = new Map(docs.map((d) => [d.key, d.value]));

        return Object.fromEntries(
          SETTING_DEFS.map((def) => [def.key, coerce(def, stored.get(def.key))])
        ) as unknown as SiteSettings;
      },
      () => DEFAULTS
    ),
  [SETTINGS_CACHE_TAG],
  { tags: [SETTINGS_CACHE_TAG], revalidate: 3600 }
);

/**
 * `cache` gộp các lần gọi trong cùng một request lại thành một lần đọc — header,
 * footer và metadata đều cần settings nên nếu không gộp sẽ tra cache lặp nhiều lần.
 */
export const getSettings = cache((): Promise<SiteSettings> => loadSettings());

export { DEFAULTS as DEFAULT_SETTING_VALUES };

/**
 * Giá trị `robots` cho metadata của trang.
 *
 * Next.js gộp metadata theo kiểu con đè cha, nên trang nào tự khai `robots` sẽ
 * xoá sạch thiết lập của layout gốc. Vì vậy mọi trang công khai phải lấy giá trị
 * qua đây, nếu không bật bảo trì mà trang vẫn báo "index" với công cụ tìm kiếm.
 */
/**
 * Chỉ thị cho riêng Googlebot.
 *
 * Mặc định Google chỉ lấy đoạn trích ngắn và ảnh xem trước cỡ nhỏ. Một trang hình
 * nền sống bằng ảnh xem trước lớn trong kết quả tìm kiếm, Google Images và
 * Discover, nên phải xin rõ "large".
 *
 * Phải nằm trong chính robotsFor chứ không chỉ khai ở layout gốc: metadata của
 * trang con GHI ĐÈ trọn khoá `robots` của layout, nên mọi trang tự đặt robots
 * (gần như tất cả trang nội dung) sẽ mất sạch các chỉ thị này.
 */
const GOOGLE_BOT_DIRECTIVES = {
  "max-snippet": -1,
  "max-image-preview": "large",
  "max-video-preview": -1,
} as const;

type Robots = NonNullable<Metadata["robots"]>;

export async function robotsFor(noindex = false): Promise<Robots> {
  const { maintenance_mode } = await getSettings();
  if (maintenance_mode || noindex) {
    return { index: false, follow: true, googleBot: { index: false, follow: true } };
  }
  return {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, ...GOOGLE_BOT_DIRECTIVES },
  };
}

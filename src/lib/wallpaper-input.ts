import "server-only";
import { Category } from "@/models/Category";
import { Wallpaper } from "@/models/Wallpaper";
import { makeSlug } from "@/lib/wallpapers";
import { resolutionLabelFor } from "@/lib/upload-limits";

import mongoose from "mongoose";

export const DEVICE_TYPES = ["pc", "phone", "both"] as const;
export const MEDIA_TYPES = ["image", "video"] as const;
export const STATUSES = ["draft", "published"] as const;

export type MediaInput = {
  url: string;
  publicId: string;
  resourceType: "image" | "video";
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  duration?: number;
  alt: string;
};

function parseMedia(raw: unknown, fallbackAlt: string): MediaInput | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  if (typeof m.url !== "string" || !m.url) return null;
  if (typeof m.publicId !== "string" || !m.publicId) return null;

  return {
    url: m.url,
    publicId: m.publicId,
    resourceType: m.resourceType === "video" ? "video" : "image",
    width: typeof m.width === "number" ? m.width : undefined,
    height: typeof m.height === "number" ? m.height : undefined,
    format: typeof m.format === "string" ? m.format : undefined,
    bytes: typeof m.bytes === "number" ? m.bytes : undefined,
    duration: typeof m.duration === "number" ? m.duration : undefined,
    alt: typeof m.alt === "string" && m.alt.trim() ? m.alt.trim() : fallbackAlt,
  };
}

/**
 * Kiểm tra giá trị "danh mục cha" gửi lên: phải tồn tại, không phải chính nó,
 * và bản thân nó không được là danh mục con (chỉ cho phép hai cấp).
 *
 * `selfId` bỏ trống khi đang tạo mới.
 */
export async function resolveParent(
  raw: unknown,
  selfId?: string
): Promise<{ parent: mongoose.Types.ObjectId | null } | { error: string }> {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return { parent: null };

  if (!mongoose.Types.ObjectId.isValid(value)) {
    return { error: "Danh mục cha không hợp lệ." };
  }
  if (selfId && value === selfId) {
    return { error: "Không thể đặt chính nó làm danh mục cha." };
  }

  const parent = await Category.findById(value);
  if (!parent) return { error: "Không tìm thấy danh mục cha." };
  if (parent.parentId) {
    return { error: `"${parent.name}" đã là danh mục con nên không thể làm danh mục cha.` };
  }

  return { parent: parent._id as unknown as mongoose.Types.ObjectId };
}

export type NormalizedWallpaper = Record<string, unknown>;

/**
 * Kiểm tra và chuẩn hoá payload từ form admin.
 *
 * `partial` dùng cho PUT: chỉ xử lý những trường có mặt trong body, để sửa mỗi
 * tiêu đề không vô tình xoá sạch media và tags.
 *
 * `excludeId` và `currentSlug` cũng chỉ dùng cho PUT: bản ghi đang sửa không
 * được tính là đụng slug với chính nó.
 */
export async function normalizeWallpaperInput(
  body: Record<string, unknown>,
  {
    partial = false,
    excludeId,
    currentSlug,
  }: { partial?: boolean; excludeId?: string; currentSlug?: string } = {}
): Promise<{ data: NormalizedWallpaper } | { error: string }> {
  const out: NormalizedWallpaper = {};
  const has = (key: string) => key in body;

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!partial || has("title")) {
    if (!title) return { error: "Tiêu đề không được để trống." };
    if (title.length > 200) return { error: "Tiêu đề không được dài quá 200 ký tự." };
    out.title = title;
  }

  if (!partial || has("slug") || has("title")) {
    const raw = typeof body.slug === "string" ? body.slug.trim() : "";
    const base = makeSlug(raw || title);
    if (!base) return { error: "Không tạo được slug từ tiêu đề. Hãy nhập slug thủ công." };
    // Trùng tiêu đề là chuyện thường, nối mốc thời gian đăng thay vì báo lỗi 409
    out.slug = await uniqueWallpaperSlug(base, { excludeId, currentSlug });
  }

  if (!partial || has("description")) {
    const d = typeof body.description === "string" ? body.description.trim() : "";
    if (d.length > 500) return { error: "Mô tả không được dài quá 500 ký tự." };
    out.description = d;
  }

  // categorySlug -> nạp luôn _id và tên để trang danh sách không phải populate
  if (!partial || has("categorySlug")) {
    const slug = typeof body.categorySlug === "string" ? body.categorySlug.trim() : "";
    if (!slug) return { error: "Vui lòng chọn danh mục." };
    const category = await Category.findOne({ slug });
    if (!category) return { error: `Không tìm thấy danh mục "${slug}".` };
    out.category = category._id;
    out.categoryName = category.name;
    out.categorySlug = category.slug;
  }

  if (!partial || has("deviceType")) {
    const v = body.deviceType;
    if (!DEVICE_TYPES.includes(v as (typeof DEVICE_TYPES)[number])) {
      return { error: "Loại thiết bị không hợp lệ." };
    }
    out.deviceType = v;
  }

  if (!partial || has("mediaType")) {
    const v = body.mediaType;
    if (!MEDIA_TYPES.includes(v as (typeof MEDIA_TYPES)[number])) {
      return { error: "Loại nội dung không hợp lệ." };
    }
    out.mediaType = v;
  }

  if (!partial || has("media")) {
    const media = parseMedia(body.media, title);
    if (!media) return { error: "Chưa tải file lên hoặc dữ liệu file không hợp lệ." };
    out.media = media;
    if (!body.resolutionLabel) out.resolutionLabel = resolutionLabelFor(media.width, media.height);
  }

  if (has("thumbnail")) {
    out.thumbnail = parseMedia(body.thumbnail, title);
  }

  // Card video cần poster, không có thì danh sách phải tải cả video chỉ để hiện khung hình đầu
  const finalMediaType = out.mediaType ?? body.mediaType;
  if (finalMediaType === "video" && !partial && !out.thumbnail) {
    return { error: "Video nền cần một ảnh đại diện (thumbnail)." };
  }

  if (has("resolutionLabel") && typeof body.resolutionLabel === "string") {
    out.resolutionLabel = body.resolutionLabel.trim();
  }

  if (!partial || has("tags")) {
    const tags = Array.isArray(body.tags)
      ? body.tags.filter((t): t is string => typeof t === "string").map((t) => t.trim()).filter(Boolean)
      : [];
    out.tags = [...new Set(tags)].slice(0, 20);
  }

  if (!partial || has("source")) {
    out.source = typeof body.source === "string" ? body.source.trim() : "";
  }

  if (!partial || has("status")) {
    const v = body.status ?? "draft";
    if (!STATUSES.includes(v as (typeof STATUSES)[number])) {
      return { error: "Trạng thái không hợp lệ." };
    }
    out.status = v;
    // publishedAt là mốc sắp xếp của trang chủ, phải đặt ngay khi chuyển sang đăng
    if (v === "published") out.publishedAt = new Date();
    else out.publishedAt = null;
  }

  if (!partial || has("allowComments")) {
    out.allowComments = body.allowComments === undefined ? true : Boolean(body.allowComments);
  }

  if (has("seo") && body.seo && typeof body.seo === "object") {
    const seo = body.seo as Record<string, unknown>;
    out.seo = {
      metaTitle: typeof seo.metaTitle === "string" ? seo.metaTitle.trim() : "",
      metaDescription: typeof seo.metaDescription === "string" ? seo.metaDescription.trim() : "",
      keywords: Array.isArray(seo.keywords)
        ? seo.keywords.filter((k): k is string => typeof k === "string")
        : [],
      canonical: typeof seo.canonical === "string" ? seo.canonical.trim() : "",
      noindex: Boolean(seo.noindex),
    };
  }

  return { data: out };
}

/**
 * Các mốc thời gian dùng làm hậu tố slug, tính theo giờ Việt Nam.
 *
 * Phải ép múi giờ: server production chạy UTC, ảnh đăng lúc 1h sáng giờ VN sẽ
 * nhận hậu tố của ngày hôm trước và admin tưởng hệ thống sai ngày.
 */
function timeSuffixes(now: Date): string[] {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  const date = `${get("year")}${get("month")}${get("day")}`;
  const hm = `${get("hour")}${get("minute")}`;
  return [date, `${date}-${hm}`, `${date}-${hm}${get("second")}`];
}

/** Khớp phần hậu tố thời gian mà {@link uniqueWallpaperSlug} sinh ra. */
const TIME_SUFFIX_RE = /-\d{8}(-\d{4}(\d{2})?)?$/;

/**
 * Slug cuối cùng cho hình nền: giữ nguyên slug gốc nếu còn trống, trùng thì nối
 * thêm mốc thời gian đăng (ngày -> ngày+giờ phút -> ngày+giờ phút giây).
 *
 * Trùng tiêu đề là chuyện bình thường ("Hoa hồng đỏ" có thể có hàng chục bản),
 * trước đây API trả 409 và bắt admin tự nghĩ slug khác.
 *
 * `currentSlug` (khi sửa) giữ nguyên slug đã phát hành nếu nó vốn sinh ra từ
 * cùng tiêu đề này — không có nó thì mỗi lần bấm Lưu slug lại đổi theo ngày
 * hiện tại, URL cũ chết và mọi liên kết đã chia sẻ hỏng theo.
 */
export async function uniqueWallpaperSlug(
  base: string,
  { excludeId, currentSlug }: { excludeId?: string; currentSlug?: string } = {}
): Promise<string> {
  if (currentSlug && (currentSlug === base || currentSlug.replace(TIME_SUFFIX_RE, "") === base)) {
    return currentSlug;
  }

  const candidates = [base, ...timeSuffixes(new Date()).map((s) => `${base}-${s}`)];

  const filter: Record<string, unknown> = { slug: { $in: candidates } };
  if (excludeId) filter._id = { $ne: excludeId };
  const taken = new Set(
    (await Wallpaper.find(filter).select("slug").lean()).map((d) => (d as { slug: string }).slug)
  );

  const free = candidates.find((c) => !taken.has(c));
  if (free) return free;

  // Cùng tiêu đề, cùng giây, cùng máy: hiếm tới mức chỉ cần một mốc luôn khác
  return `${base}-${Date.now().toString(36)}`;
}

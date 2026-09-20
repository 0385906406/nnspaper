import "server-only";
import { Category } from "@/models/Category";
import { makeSlug } from "@/lib/wallpapers";

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

/**
 * Nhãn độ phân giải suy ra từ kích thước thật thay vì bắt admin tự gõ — gõ tay
 * thì mỗi người viết một kiểu ("4K", "4k UHD", "3840x2160") và badge trên card loạn.
 */
export function resolutionLabelFor(width?: number, height?: number): string {
  if (!width || !height) return "";
  const long = Math.max(width, height);
  if (long >= 3840) return "4K UHD";
  if (long >= 2560) return "2K";
  if (long >= 1920) return "FHD";
  if (long >= 1280) return "HD";
  return "";
}

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
 */
export async function normalizeWallpaperInput(
  body: Record<string, unknown>,
  { partial = false }: { partial?: boolean } = {}
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
    const slug = makeSlug(raw || title);
    if (!slug) return { error: "Không tạo được slug từ tiêu đề. Hãy nhập slug thủ công." };
    out.slug = slug;
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

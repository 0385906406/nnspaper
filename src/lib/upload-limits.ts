/**
 * Hằng số và tiện ích cho việc tải file lên, dùng chung cho cả client lẫn server.
 *
 * Tách riêng khỏi `wallpaper-input.ts` vì file đó là "server-only": từ khi trình
 * duyệt tự tải thẳng lên Cloudinary, chính client là nơi phải kiểm tra dung lượng
 * và suy ra nhãn độ phân giải.
 */

export const MAX_IMAGE = 15 * 1024 * 1024;
export const MAX_VIDEO = 100 * 1024 * 1024;

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

/** Giới hạn dung lượng theo loại file, kèm nhãn để dựng thông báo lỗi. */
export function limitFor(isVideo: boolean): { bytes: number; label: string } {
  const bytes = isVideo ? MAX_VIDEO : MAX_IMAGE;
  return { bytes, label: `${Math.round(bytes / 1024 / 1024)}MB` };
}

/**
 * Hằng số và tiện ích cho việc tải file lên, dùng chung cho cả client lẫn server.
 *
 * Tách riêng khỏi `wallpaper-input.ts` vì file đó là "server-only": từ khi trình
 * duyệt tự tải thẳng lên kho lưu, chính client là nơi phải kiểm tra dung lượng
 * và suy ra nhãn độ phân giải.
 */

/**
 * Trần của Cloudinary, lấy đúng theo `media_limits` mà họ áp cho gói Free (đọc
 * bằng `cloudinary.api.usage()`): ảnh 10MB, video 100MB.
 *
 * Phải khớp chứ không được đặt cao hơn: Cloudinary chặn ở phía họ, nên để 15MB
 * như trước nghĩa là ảnh 10–15MB vẫn được tải lên hết rồi mới bị từ chối — admin
 * chờ xong mới nhận lỗi khó hiểu thay vì bị chặn ngay từ đầu.
 *
 * Nâng gói Cloudinary thì sửa lại cho khớp `media_limits` của gói mới.
 */
export const MAX_IMAGE = 10 * 1024 * 1024;
export const MAX_VIDEO_CLOUDINARY = 100 * 1024 * 1024;

/**
 * Trần khi video được lưu trên Cloudflare R2.
 *
 * R2 cho tối đa 4.995GiB cho một lần PUT (trên nữa phải chia khúc). Đặt 4GB cho
 * tròn và còn dư khoảng an toàn, vẫn gấp 40 lần mức 100MB của Cloudinary Free.
 */
export const MAX_VIDEO_R2 = 4 * 1024 * 1024 * 1024;

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

/** Giới hạn dung lượng theo loại file và kho sẽ lưu, kèm nhãn để dựng thông báo. */
export function limitFor(isVideo: boolean, onR2 = false): { bytes: number; label: string } {
  const bytes = isVideo ? (onR2 ? MAX_VIDEO_R2 : MAX_VIDEO_CLOUDINARY) : MAX_IMAGE;
  const label =
    bytes >= 1024 * 1024 * 1024
      ? `${Math.round(bytes / 1024 / 1024 / 1024)}GB`
      : `${Math.round(bytes / 1024 / 1024)}MB`;
  return { bytes, label };
}

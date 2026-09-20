import "server-only";
import { destroyAsset, UPLOAD_FOLDER } from "@/lib/cloudinary";
import { Wallpaper } from "@/models/Wallpaper";

export { destroyAsset };

/** File hình nền do admin tải lên luôn nằm trong thư mục này. */
export const WALLPAPER_FOLDER = `${UPLOAD_FOLDER}/wallpapers/`;

/**
 * Xoá một file hình nền trên Cloudinary nếu không hình nền nào còn dùng tới.
 * Chỉ động vào file trong thư mục upload để không lỡ xoá ảnh demo/branding.
 * Lỗi từ Cloudinary chỉ ghi log — dọn file là việc phụ, không được làm hỏng thao tác chính.
 */
export async function destroyUnusedAsset(
  publicId: string,
  resourceType: "image" | "video"
): Promise<boolean> {
  if (!publicId.startsWith(WALLPAPER_FOLDER)) return false;

  const inUse = await Wallpaper.exists({
    $or: [{ "media.publicId": publicId }, { "thumbnail.publicId": publicId }],
  });
  if (inUse) return false;

  try {
    await destroyAsset(publicId, resourceType);
    return true;
  } catch (error) {
    console.error("Không xoá được file trên Cloudinary:", publicId, error);
    return false;
  }
}

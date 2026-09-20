import "server-only";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

/**
 * Cloudinary — nơi lưu ảnh/video miễn phí (gói free: 25 credit/tháng,
 * đủ cho ~25GB lưu trữ hoặc 25GB băng thông, kèm CDN và transform tự động).
 *
 * Ảnh/video KHÔNG lưu trong MongoDB và cũng không lưu trong container Docker —
 * chỉ lưu URL + public_id trong DB, file nằm trên CDN của Cloudinary.
 */

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export function assertCloudinaryConfigured(): void {
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Thiếu cấu hình Cloudinary. Cần CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET trong .env.local."
    );
  }
}

export const UPLOAD_FOLDER = process.env.CLOUDINARY_FOLDER || "nextjs-seo-web";

/** Upload một file (dạng Buffer) lên Cloudinary. `auto` nhận cả ảnh lẫn video. */
export function uploadBuffer(
  buffer: Buffer,
  options: {
    folder?: string;
    resourceType?: "image" | "video" | "auto";
    publicId?: string;
    /** Ghi đè file cùng public_id và xoá bản cũ trên CDN (dùng cho logo/favicon). */
    overwrite?: boolean;
  } = {}
): Promise<UploadApiResponse> {
  assertCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder ?? UPLOAD_FOLDER,
        resource_type: options.resourceType ?? "auto",
        public_id: options.publicId,
        ...(options.overwrite ? { overwrite: true, invalidate: true } : {}),
        // Tự nén và chọn định dạng tốt nhất cho từng trình duyệt
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("Cloudinary không trả về kết quả"));
        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

/** Xoá file khỏi Cloudinary (dùng khi xoá bài viết để không tốn dung lượng free). */
export async function destroyAsset(
  publicId: string,
  resourceType: "image" | "video" = "image"
): Promise<void> {
  assertCloudinaryConfigured();
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

export { cloudinary };

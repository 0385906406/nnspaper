import "server-only";
import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 — nơi lưu riêng video hình nền.
 *
 * Tách khỏi Cloudinary vì gói Cloudinary Free chặn file video ở 100MB, còn R2
 * cho tới 5GiB mỗi lần tải lên và KHÔNG tính tiền băng thông ra (egress), thứ
 * vốn tốn nhất với một site hình nền.
 *
 * R2 chỉ là kho chứa byte: nó không transcode và không cắt được khung hình làm
 * poster. Nên ảnh và poster vẫn ở Cloudinary, chỉ video sang đây — poster của
 * video được trình duyệt cắt từ khung đầu rồi đẩy lên Cloudinary như một ảnh.
 */

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;
/** Tên miền công khai trỏ tới bucket. Bắt buộc phải là custom domain: r2.dev bị
 *  Cloudflare giới hạn tốc độ và chỉ dành cho môi trường phát triển. */
const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "");

/**
 * Chưa cấu hình đủ biến thì mọi thứ lặng lẽ quay về dùng Cloudinary, không sập.
 * Nhờ vậy dự án chạy bình thường trước khi ai kịp tạo bucket.
 */
export function isR2Configured(): boolean {
  return Boolean(accountId && accessKeyId && secretAccessKey && bucket && publicUrl);
}

let client: S3Client | null = null;
function s3(): S3Client {
  if (!isR2Configured()) {
    throw new Error("Thiếu cấu hình R2. Cần R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL.");
  }
  client ??= new S3Client({
    // R2 không có khái niệm region, "auto" là giá trị nó yêu cầu
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKeyId as string, secretAccessKey: secretAccessKey as string },
    // Bắt buộc với presigned URL. Mặc định SDK tự tính checksum CRC32 và nhúng
    // vào URL dưới dạng query param; lúc ký thì chưa có body nên nó tính ra
    // checksum của body RỖNG (AAAAAA==). Trình duyệt PUT file thật vào URL đó là
    // R2 đối chiếu lệch và từ chối sạch mọi lần tải lên.
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
  return client;
}

/** Thư mục chứa video hình nền trong bucket, cũng là chốt an toàn khi xoá. */
export const R2_VIDEO_PREFIX = "wallpapers/videos/";

/** URL công khai của một object. */
export function r2PublicUrl(key: string): string {
  return `${publicUrl}/${key}`;
}

/**
 * URL đã ký để trình duyệt PUT thẳng file lên R2.
 *
 * Trình duyệt tải lên trực tiếp, không đi qua Next.js: function trên Vercel chỉ
 * nhận request body tối đa 4.5MB nên không thể làm trung gian cho video.
 */
export async function presignVideoUpload(
  fileName: string,
  contentType: string
): Promise<{ key: string; uploadUrl: string; publicUrl: string }> {
  // Tên file do người dùng đặt không dùng trực tiếp làm key: dấu cách, tiếng Việt
  // và ký tự lạ làm URL phải encode, còn trùng tên thì ghi đè file của nhau.
  const ext = (fileName.match(/\.([a-z0-9]{1,5})$/i)?.[1] ?? "mp4").toLowerCase();
  const key = `${R2_VIDEO_PREFIX}${Date.now().toString(36)}-${crypto.randomUUID()}.${ext}`;

  const uploadUrl = await getSignedUrl(
    s3(),
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn: 3600 }
  );

  return { key, uploadUrl, publicUrl: r2PublicUrl(key) };
}

/** Xoá một video khỏi R2. Chỉ cho xoá trong thư mục video để không lỡ tay. */
export async function deleteR2Object(key: string): Promise<boolean> {
  if (!key.startsWith(R2_VIDEO_PREFIX)) return false;
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    console.error("Không xoá được object trên R2:", key, error);
    return false;
  }
}

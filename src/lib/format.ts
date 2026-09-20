/** Rút gọn số lớn cho các bộ đếm (lượt thích, lượt tải...): 1200 -> "1,2K". */
export function formatCount(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

/** Định dạng ngày kiểu Việt Nam: 24/08/2026. */
export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** Định dạng dung lượng file: 15728640 -> "15.0 MB". */
export function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${mb.toFixed(1)} MB`;
}

/** Thêm cờ fl_attachment vào URL Cloudinary để trình duyệt tải file thay vì mở xem. */
export function toDownloadUrl(url: string): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", "/upload/fl_attachment/");
}

/** Thời gian tương đối kiểu "5 phút", "3 ngày" cho bình luận; quá 4 tuần thì hiện ngày. */
export function formatRelative(value: string | Date, now: number = Date.now()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (seconds < 60) return "vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} tuần`;
  return formatDate(date);
}

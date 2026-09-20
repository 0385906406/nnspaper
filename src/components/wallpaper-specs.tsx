import type { WallpaperView } from "@/lib/wallpapers";
import { formatBytes, formatDate } from "@/lib/format";

const DEVICE_LABEL: Record<WallpaperView["deviceType"], string> = {
  pc: "Máy tính (PC)",
  phone: "Điện thoại",
  both: "PC & Điện thoại",
};

/** Thông số kỹ thuật dạng bảng hai cột gọn, đặt trong mục "Chi tiết" có thể thu gọn. */
export function WallpaperSpecs({ wallpaper }: { wallpaper: WallpaperView }) {
  const rows: [string, string][] = [
    ["Thiết bị", DEVICE_LABEL[wallpaper.deviceType]],
    ["Độ phân giải", wallpaper.resolutionLabel || "—"],
    [
      "Định dạng",
      wallpaper.mediaType === "video"
        ? `${(wallpaper.media.format || "MP4").toUpperCase()} · Video lặp`
        : (wallpaper.media.format || "").toUpperCase() || "—",
    ],
    ["Chủ đề", wallpaper.categoryName],
    ["Dung lượng", formatBytes(wallpaper.media.bytes) || "—"],
  ];
  if (wallpaper.publishedAt) rows.push(["Ngày đăng", formatDate(wallpaper.publishedAt)]);

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted">{label}</dt>
          <dd className="truncate text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

import type { WallpaperView } from "@/lib/wallpapers";
import { WallpaperCard } from "@/components/wallpaper-card";

export const DEFAULT_COLUMNS = "[--cols:2] sm:[--cols:3] md:[--cols:4] xl:[--cols:5] 2xl:[--cols:6]";

/** Lưới so le (masonry) kiểu Pinterest — xem .masonry trong globals.css. */
export function WallpaperGrid({
  items,
  columns = DEFAULT_COLUMNS,
  sizes,
  priorityCount = 4,
}: {
  items: WallpaperView[];
  /** Ghi đè số cột theo breakpoint (biến --cols), vd. cột đề xuất hẹp ở trang chi tiết. */
  columns?: string;
  sizes?: string;
  /** Số ảnh đầu được preload (LCP). Preload nhiều ảnh một lúc thì chúng tranh băng
   * thông với nhau và LCP chậm hơn, nên chỉ đủ phủ phần trên màn hình (~4 ảnh). */
  priorityCount?: number;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-24 text-center">
        <p className="text-lg font-medium text-foreground">Không tìm thấy hình nền nào</p>
        <p className="text-sm text-muted">Thử đổi bộ lọc hoặc từ khoá tìm kiếm khác nhé.</p>
      </div>
    );
  }

  return (
    <div className="masonry-wrap">
      <div className={`masonry ${columns}`}>
        {items.map((wallpaper, index) => (
          <WallpaperCard key={wallpaper.id} wallpaper={wallpaper} priority={index < priorityCount} sizes={sizes} />
        ))}
      </div>
    </div>
  );
}

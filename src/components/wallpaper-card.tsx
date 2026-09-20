import Link from "next/link";
import type { WallpaperView } from "@/lib/wallpapers";
import { formatCount } from "@/lib/format";
import { coverOf } from "@/lib/cover";
import { WallpaperCardMedia } from "@/components/wallpaper-card-media";
import { CommentIcon, HeartIcon, PlayIcon } from "@/components/icons";

/**
 * Số hàng lưới card chiếm (xem .masonry trong globals.css): cột rộng 40 đơn vị nên
 * cao = 40 / tỉ lệ, cộng 2 đơn vị khoảng cách. Tỉ lệ được kẹp lại để ảnh quá dài
 * hoặc quá bẹt không làm vỡ nhịp của cột.
 */
function rowSpan(width?: number, height?: number): number {
  const ratio = width && height ? Math.min(1.8, Math.max(0.5, width / height)) : 3 / 4;
  return Math.round(40 / ratio) + 2;
}

export function WallpaperCard({
  wallpaper,
  priority = false,
  sizes = "(min-width: 1536px) 16vw, (min-width: 1280px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw",
}: {
  wallpaper: WallpaperView;
  priority?: boolean;
  sizes?: string;
}) {
  const cover = coverOf(wallpaper);
  const span = rowSpan(cover.width ?? wallpaper.media.width, cover.height ?? wallpaper.media.height);

  return (
    // Chỉ hiện ảnh, không kèm tiêu đề — tên vẫn có trong aria-label và alt cho SEO/trình đọc màn hình
    <Link
      href={`/hinh-nen/${wallpaper.slug}`}
      aria-label={wallpaper.title}
      className="masonry-item group"
      style={{ gridRowEnd: `span ${span}` }}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-surface-2">
        <WallpaperCardMedia
          imageUrl={cover.url}
          alt={cover.alt || wallpaper.title}
          sizes={sizes}
          priority={priority}
          previewVideoUrl={wallpaper.mediaType === "video" ? wallpaper.media.url : undefined}
        />

        <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/35" />

        {wallpaper.mediaType === "video" && (
          <span className="pointer-events-none absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-semibold text-white">
            <PlayIcon className="h-3.5 w-3.5" />
            Video
          </span>
        )}

        {wallpaper.resolutionLabel && (
          <span className="pointer-events-none absolute top-2.5 right-2.5 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
            {wallpaper.resolutionLabel}
          </span>
        )}

        <div className="pointer-events-none absolute right-2.5 bottom-2.5 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-bold text-black">
            <HeartIcon className="h-3.5 w-3.5" />
            {formatCount(wallpaper.likes)}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-bold text-black">
            <CommentIcon className="h-3.5 w-3.5" />
            {formatCount(wallpaper.commentCount)}
          </span>
        </div>
      </div>
    </Link>
  );
}

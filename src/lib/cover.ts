import type { MediaView, WallpaperView } from "@/lib/wallpapers";

/**
 * Ảnh đại diện để hiện ở card/OG image. Video phải có ảnh tĩnh — video cũ thiếu
 * thumbnail thì nhờ Cloudinary cắt khung hình đầu (so_0) thành JPG, thay vì đưa
 * nguyên file .mp4 vào thẻ <img> (ảnh vỡ).
 */
export function coverOf(wallpaper: Pick<WallpaperView, "mediaType" | "media" | "thumbnail">): MediaView {
  if (wallpaper.mediaType !== "video") return wallpaper.media;
  if (wallpaper.thumbnail?.url) return wallpaper.thumbnail;

  const { media } = wallpaper;
  if (media.url.includes("res.cloudinary.com") && media.url.includes("/video/upload/")) {
    return {
      ...media,
      resourceType: "image",
      format: "jpg",
      url: media.url.replace("/video/upload/", "/video/upload/so_0/").replace(/\.[a-z0-9]+$/i, ".jpg"),
    };
  }
  return media;
}

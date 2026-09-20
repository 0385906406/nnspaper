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

/**
 * URL phát video, có nén.
 *
 * Video không còn được nén lúc tải lên (làm upload chậm gấp 3.6 lần và kéo theo
 * timeout), nên phải nén khi phát: `q_auto` để Cloudinary tự chọn mức nén, còn
 * `vc_auto` để chọn codec hợp trình duyệt. Cloudinary chuyển mã ở lần gọi đầu
 * rồi cache trên CDN, nên đây là chi phí một lần cho mỗi video.
 */
export function videoSrc(url: string): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/video/upload/")) return url;
  // Đã chèn transformation rồi thì thôi, tránh nối chồng khi hàm bị gọi hai lần
  if (url.includes("/video/upload/q_auto")) return url;
  return url.replace("/video/upload/", "/video/upload/q_auto,vc_auto/");
}

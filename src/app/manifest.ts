import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { getSettings } from "@/lib/settings";

// Web manifest: Chrome Android/iOS Safari cho "Thêm vào màn hình chính", và
// Lighthouse tính đây là một phần của điểm SEO/PWA cho trang mobile.

/** Favicon admin đặt có thể là .png/.svg/.ico — khai sai type thì Chrome bỏ qua icon. */
function mimeOf(url: string): string {
  const path = url.split(/[?#]/)[0].toLowerCase();
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  return "image/x-icon";
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSettings();
  const icon = settings.site_favicon || "/favicon.ico";

  return {
    name: `${settings.site_name} — Hình nền & Video nền 4K`,
    short_name: settings.site_name,
    description: settings.site_description,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0d",
    theme_color: "#0a0a0d",
    lang: siteConfig.lang,
    icons: [{ src: icon, sizes: "any", type: mimeOf(icon) }],
  };
}

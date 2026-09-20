import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

// Chặn ngay ở robots.txt những khu vực không có giá trị tìm kiếm: bot không tốn
// crawl budget vào đó, và crawl budget dồn hết cho trang hình nền + danh mục.
const PRIVATE_PATHS = [
  "/api/",
  "/admin",
  "/profile",
  "/yeu-thich",
  "/dang-nhap",
  "/dang-ky",
  "/verify-email",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE_PATHS }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/").replace(/\/$/, ""),
  };
}

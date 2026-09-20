import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

// Ảnh chia sẻ mặc định cho toàn site: Facebook/Zalo/X hiển thị nó khi trang được
// share mà không tự khai `openGraph.images` (trang chi tiết thì dùng ảnh hình nền).
export const alt = `${siteConfig.name} — Hình nền & video nền 4K miễn phí`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          background: "linear-gradient(135deg, #0a0a0d 0%, #16121f 55%, #1d1630 100%)",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 132,
            height: 132,
            borderRadius: 36,
            background: "linear-gradient(135deg, #7c5cff 0%, #ff4d94 100%)",
            fontSize: 58,
            fontWeight: 800,
            letterSpacing: -2,
          }}
        >
          {siteConfig.shortName}
        </div>

        <div style={{ fontSize: 92, fontWeight: 800, letterSpacing: -4 }}>
          {siteConfig.name}
        </div>

        <div style={{ fontSize: 38, color: "#b9b4c7", textAlign: "center", padding: "0 80px" }}>
          Hình nền &amp; video nền 4K miễn phí cho điện thoại và máy tính
        </div>
      </div>
    ),
    size,
  );
}

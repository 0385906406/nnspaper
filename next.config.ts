import type { NextConfig } from "next";

/**
 * Tên miền công khai của bucket R2, nếu có cấu hình.
 *
 * next/image ném lỗi runtime — không phải chỉ hiện ảnh lỗi — khi gặp hostname
 * chưa khai trong remotePatterns. Video R2 bình thường luôn có poster nằm trên
 * Cloudinary, nhưng nếu poster thiếu thì URL R2 sẽ rơi vào next/image và làm sập
 * cả trang. Khai sẵn ở đây để trường hợp đó chỉ là một ảnh lỗi.
 */
const r2Host = (() => {
  try {
    return process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).hostname : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  // Standalone để Docker image nhẹ (~150MB thay vì cả node_modules). Phải tắt trên
  // Vercel: builder của Vercel tự trace file và đọc .next/next-server.js.nft.json,
  // còn standalone gom hết vào .next/standalone nên build fail với ENOENT.
  output: process.env.VERCEL ? undefined : "standalone",

  // mongoose dùng API native của Node, không được bundle vào bundle server
  serverExternalPackages: ["mongoose"],

  // Không lộ header "X-Powered-By: Next.js"
  poweredByHeader: false,

  // Bắt buộc cho SEO: mỗi URL chỉ có một dạng duy nhất (tránh nội dung trùng lặp)
  trailingSlash: false,

  images: {
    // Cho phép next/image tối ưu ảnh lấy từ Cloudinary
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      ...(r2Host ? [{ protocol: "https" as const, hostname: r2Host, pathname: "/**" }] : []),
    ],
    // AVIF/WebP giảm dung lượng ảnh mạnh -> điểm Core Web Vitals (LCP) tốt hơn
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 14400,
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

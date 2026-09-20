import type { NextConfig } from "next";

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

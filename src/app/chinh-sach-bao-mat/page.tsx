import type { Metadata } from "next";
import { StaticPage } from "@/components/static-page";
import { siteConfig, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Chính sách bảo mật",
  description: `Chính sách bảo mật của ${siteConfig.name}: dữ liệu nào được lưu và cách sử dụng.`,
  alternates: { canonical: absoluteUrl("/chinh-sach-bao-mat") },
};

export default function PrivacyPage() {
  return (
    <StaticPage
      icon="🔒"
      title="Chính sách bảo mật"
      description="Dữ liệu nào được thu thập và cách chúng tôi sử dụng khi bạn dùng trang."
    >
      <p>
        {siteConfig.name} không yêu cầu đăng ký tài khoản để xem hoặc tải hình nền. Trang chỉ lưu
        những dữ liệu tối thiểu cần thiết để vận hành tính năng.
      </p>
      <h2>Dữ liệu được lưu</h2>
      <p>
        Lượt thích/không thích, lượt tải và lượt xem được đếm ở mức tổng hợp cho từng hình nền, không
        gắn với danh tính cá nhân. Trình duyệt của bạn lưu tạm một lựa chọn (đã thích/chưa thích) bằng
        <code className="mx-1 rounded bg-surface-2 px-1 py-0.5 text-xs">localStorage</code>
        để tránh vote trùng — dữ liệu này chỉ nằm trên máy bạn, chúng tôi không truy cập được.
      </p>
      <h2>Bên thứ ba</h2>
      <p>
        Ảnh/video được phân phối qua CDN của bên lưu trữ (Cloudinary). Chúng tôi không chia sẻ dữ
        liệu sử dụng cho bên quảng cáo hay theo dõi nào khác.
      </p>
      <h2>Thay đổi chính sách</h2>
      <p>Chính sách có thể được cập nhật khi trang bổ sung tính năng mới; phiên bản mới nhất luôn ở trang này.</p>
    </StaticPage>
  );
}

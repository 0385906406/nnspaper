import type { Metadata } from "next";
import { StaticPage } from "@/components/static-page";
import { siteConfig, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Về chúng tôi",
  description: `Giới thiệu về ${siteConfig.name} — kho hình nền và video nền 4K cho điện thoại, máy tính.`,
  alternates: { canonical: absoluteUrl("/gioi-thieu") },
};

export default function AboutPage() {
  return (
    <StaticPage
      icon="🏢"
      title="Về chúng tôi"
      description={`Tìm hiểu về ${siteConfig.name} và cách kho hình nền này được vận hành.`}
    >
      <p>
        <strong>{siteConfig.name}</strong> là nơi tổng hợp hình nền tĩnh và hình nền động (live
        wallpaper) chất lượng cao dành cho điện thoại và máy tính, được sắp xếp theo chủ đề như
        Anime, Game, Phong cảnh, Dark/Creepy... để bạn dễ dàng tìm được hình nền ưng ý.
      </p>
      <h2>Nội dung trên trang</h2>
      <p>
        Toàn bộ ảnh và video được lưu trữ và phân phối qua CDN, hiển thị đúng độ phân giải gốc (2K,
        4K UHD...) và có thể tải trực tiếp không qua bước rút gọn liên kết.
      </p>
      <h2>Bản quyền nội dung</h2>
      <p>
        Chúng tôi cố gắng ghi rõ nguồn ảnh khi có thông tin. Nếu bạn là tác giả/chủ sở hữu và muốn
        gỡ hoặc bổ sung ghi nguồn cho một hình nền cụ thể, vui lòng liên hệ với chúng tôi — xem chi
        tiết tại trang{" "}
        <a href="/mien-tru-trach-nhiem" className="text-accent hover:underline">
          Miễn trừ trách nhiệm
        </a>
        .
      </p>
    </StaticPage>
  );
}

import type { Metadata } from "next";
import { StaticPage } from "@/components/static-page";
import { siteConfig, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Miễn trừ trách nhiệm",
  description: `Thông tin về bản quyền nội dung và giới hạn trách nhiệm của ${siteConfig.name}.`,
  alternates: { canonical: absoluteUrl("/mien-tru-trach-nhiem") },
};

export default function DisclaimerPage() {
  return (
    <StaticPage
      icon="⚠️"
      title="Miễn trừ trách nhiệm"
      description="Thông tin về bản quyền nội dung và giới hạn trách nhiệm."
    >
      <p>
        Hình nền và video trên {siteConfig.name} thuộc bản quyền của tác giả/nguồn gốc tương ứng.
        Chúng tôi tổng hợp và ghi rõ nguồn khi có thông tin, nhằm mục đích chia sẻ cho người dùng đặt
        làm hình nền cá nhân.
      </p>
      <h2>Yêu cầu gỡ nội dung</h2>
      <p>
        Nếu bạn là chủ sở hữu bản quyền của một hình ảnh/video trên trang và muốn được gỡ xuống hoặc
        bổ sung ghi nguồn chính xác, vui lòng liên hệ với chúng tôi kèm đường dẫn nội dung liên quan —
        nội dung sẽ được xử lý trong thời gian sớm nhất.
      </p>
      <h2>Không đảm bảo tuyệt đối</h2>
      <p>
        Trang cố gắng đảm bảo thông tin (độ phân giải, định dạng, chủ đề...) chính xác nhất có thể
        nhưng không đảm bảo không có sai sót. Chúng tôi không chịu trách nhiệm cho thiệt hại phát sinh
        từ việc sử dụng nội dung tải từ trang.
      </p>
    </StaticPage>
  );
}

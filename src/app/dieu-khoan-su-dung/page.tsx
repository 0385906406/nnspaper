import type { Metadata } from "next";
import { StaticPage } from "@/components/static-page";
import { siteConfig, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng",
  description: `Điều khoản sử dụng khi truy cập và tải nội dung từ ${siteConfig.name}.`,
  alternates: { canonical: absoluteUrl("/dieu-khoan-su-dung") },
};

export default function TermsPage() {
  return (
    <StaticPage
      icon="📜"
      title="Điều khoản sử dụng"
      description="Các điều khoản áp dụng khi bạn truy cập và tải nội dung từ trang."
    >
      <p>Khi truy cập và sử dụng {siteConfig.name}, bạn đồng ý với các điều khoản dưới đây.</p>
      <h2>Phạm vi sử dụng</h2>
      <p>
        Hình nền và video tải về chỉ dùng cho mục đích cá nhân (đặt màn hình điện thoại, máy tính).
        Không sao chép, phân phối lại hoặc sử dụng cho mục đích thương mại nếu không được sự cho phép
        của chủ sở hữu nội dung gốc.
      </p>
      <h2>Tương tác trên trang</h2>
      <p>
        Tính năng thích/không thích và tải xuống được đếm để phục vụ thống kê nội bộ. Chúng tôi có
        quyền giới hạn hoặc điều chỉnh các tính năng này bất cứ lúc nào nếu phát hiện lạm dụng.
      </p>
      <h2>Giới hạn trách nhiệm</h2>
      <p>
        Nội dung được cung cấp &quot;nguyên trạng&quot;, trang có thể gián đoạn để bảo trì hoặc nâng cấp. Xem
        thêm tại trang{" "}
        <a href="/mien-tru-trach-nhiem" className="text-accent hover:underline">
          Miễn trừ trách nhiệm
        </a>
        .
      </p>
      <h2>Thay đổi điều khoản</h2>
      <p>Điều khoản có thể được cập nhật; việc tiếp tục sử dụng trang sau khi cập nhật đồng nghĩa bạn chấp nhận điều khoản mới.</p>
    </StaticPage>
  );
}

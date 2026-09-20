import type { Metadata } from "next";
import { StaticPage } from "@/components/static-page";
import { siteConfig, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Câu hỏi thường gặp",
  description: `Giải đáp các câu hỏi thường gặp khi tải và sử dụng hình nền trên ${siteConfig.name}.`,
  alternates: { canonical: absoluteUrl("/cau-hoi-thuong-gap") },
};

const faqs = [
  {
    q: "Tải hình nền trên trang có mất phí không?",
    a: "Không. Toàn bộ hình nền và video nền trên trang đều miễn phí tải về cho mục đích sử dụng cá nhân.",
  },
  {
    q: "Hình nền có đúng độ phân giải như hiển thị không?",
    a: 'Có. Mỗi hình nền đều ghi rõ nhãn độ phân giải (2K, 4K UHD...) ở trang chi tiết, và file tải về giữ nguyên chất lượng gốc, không bị nén thêm.',
  },
  {
    q: "Hình nền động (Live Wallpaper) dùng như thế nào?",
    a: "Hình nền động là file video ngắn lặp lại liên tục. Sau khi tải về, bạn dùng ứng dụng đặt hình nền động có sẵn trên điện thoại/máy tính để đặt file video làm màn hình chờ.",
  },
  {
    q: "Tôi có thể dùng hình nền cho mục đích thương mại không?",
    a: "Không, trừ khi được sự cho phép rõ ràng từ chủ sở hữu nội dung gốc. Xem chi tiết tại trang Điều khoản sử dụng.",
  },
  {
    q: "Làm sao để yêu cầu gỡ một hình nền cụ thể?",
    a: "Gửi email kèm đường dẫn hình nền tới đội ngũ quản trị tại trang Liên hệ, chúng tôi sẽ xử lý trong thời gian sớm nhất.",
  },
  {
    q: "Vì sao lượt thích/tải của một hình nền không tăng?",
    a: "Số liệu được cập nhật gần như ngay lập tức sau mỗi lượt thích hoặc tải. Nếu không thấy thay đổi, hãy thử tải lại trang — có thể trình duyệt đang hiển thị bản lưu cache cũ.",
  },
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <StaticPage
      icon="❓"
      title="Câu hỏi thường gặp"
      description="Giải đáp nhanh các thắc mắc phổ biến khi tải và sử dụng hình nền."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {faqs.map((item) => (
        <div key={item.q}>
          <h2>{item.q}</h2>
          <p>{item.a}</p>
        </div>
      ))}
    </StaticPage>
  );
}

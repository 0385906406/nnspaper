import type { Metadata } from "next";
import { StaticPage } from "@/components/static-page";
import { getSettings } from "@/lib/settings";
import { absoluteUrl } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: "Liên hệ",
    description: `Liên hệ với đội ngũ ${settings.site_name} để góp ý, báo lỗi hoặc yêu cầu gỡ ảnh.`,
    alternates: { canonical: absoluteUrl("/lien-he") },
  };
}

export default async function ContactPage() {
  const settings = await getSettings();

  return (
    <StaticPage
      icon="📧"
      title="Liên hệ"
      description="Góp ý, báo lỗi hoặc yêu cầu liên quan đến bản quyền nội dung."
    >
      <p>
        Mọi góp ý, báo lỗi hiển thị hoặc yêu cầu liên quan đến bản quyền nội dung trên{" "}
        <strong>{settings.site_name}</strong>, vui lòng liên hệ qua email bên dưới.
      </p>
      <h2>Email</h2>
      <p>
        <a href={`mailto:${settings.contact_email}`} className="text-accent hover:underline">
          {settings.contact_email}
        </a>
      </p>
      <h2>Báo lỗi bản quyền</h2>
      <p>
        Nếu bạn là tác giả hoặc chủ sở hữu của một hình nền đang hiển thị trên trang và muốn gỡ
        xuống hoặc bổ sung ghi nguồn, hãy gửi email kèm đường dẫn tới hình nền đó — chúng tôi sẽ
        xử lý trong thời gian sớm nhất. Xem thêm tại trang{" "}
        <a href="/mien-tru-trach-nhiem" className="text-accent hover:underline">
          Miễn trừ trách nhiệm
        </a>
        .
      </p>
      <h2>Đóng góp hình nền</h2>
      <p>
        Bạn có bộ sưu tập hình nền hoặc video nền chất lượng cao muốn chia sẻ? Hãy gửi kèm nguồn
        ảnh/video qua email ở trên, chúng tôi sẽ xem xét đăng tải và ghi công tác giả.
      </p>
    </StaticPage>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { getCurrentUser } from "@/lib/admin";

export const metadata: Metadata = {
  title: {
    default: "Admin Dashboard",
    template: "%s | Admin",
  },
  // Trang quản trị không bao giờ được lập chỉ mục: nội dung sau đăng nhập lọt vào
  // Google chỉ tạo kết quả rác và lộ cấu trúc hệ thống.
  robots: { index: false, follow: false },
};

const ADMIN_PANEL_ROLES = new Set(["admin", "editor"]);

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // getCurrentUser đọc thẳng từ DB, nên tài khoản vừa bị khoá hoặc vừa bị hạ
  // quyền sẽ mất quyền vào ngay, không đợi JWT hết hạn.
  const user = await getCurrentUser();

  if (!user) redirect("/dang-nhap?next=%2Fadmin");
  if (!ADMIN_PANEL_ROLES.has(user.role)) redirect("/?error=forbidden");

  return (
    // Khoá chiều cao ở khung ngoài và chỉ cho <main> cuộn: sidebar với header
    // nhờ vậy đứng yên khi cuộn nội dung, thay vì trôi lên theo cả trang.
    <div className="flex h-dvh overflow-hidden bg-background">
      <AdminSidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminHeader
          name={user.name ?? user.email ?? "Admin"}
          email={user.email ?? ""}
          role={user.role}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

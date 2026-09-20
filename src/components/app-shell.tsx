import type { ReactNode } from "react";
import { getCategories } from "@/lib/categories";
import { getSettings, resolveLogoMode } from "@/lib/settings";
import { getUserMascot } from "@/lib/mascot-preference";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteSidebar } from "@/components/site-sidebar";
import { SiteFooter } from "@/components/site-footer";
import { BackToTop } from "@/components/back-to-top";
import { MaintenanceScreen } from "@/components/maintenance-screen";

type Props = {
  searchQuery?: string;
  children: ReactNode;
};

/**
 * Khung layout dùng chung: thanh điều hướng dọc + ô tìm kiếm + nội dung. Chủ đề và
 * loại thiết bị chọn từ thanh dọc (nút Danh mục, PC, Điện thoại), không có hàng lọc riêng.
 */
export async function AppShell({ searchQuery, children }: Props) {
  const [categories, settings, session] = await Promise.all([getCategories(), getSettings(), auth()]);
  const logoMode = resolveLogoMode(settings);
  const mascot = await getUserMascot(session?.user?.id);
  const role = session?.user?.role;
  const canOpenAdmin = role === "admin" || role === "editor";

  // Quản trị viên/biên tập viên vẫn phải xem được site để kiểm tra trước khi mở lại
  if (settings.maintenance_mode && !canOpenAdmin) {
    return <MaintenanceScreen siteName={settings.site_name} message={settings.maintenance_message} />;
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteSidebar
        categories={categories}
        siteName={settings.site_name}
        logoMode={logoMode}
        logoText={settings.site_logo_text}
        logoImage={settings.site_logo_image}
        loggedIn={Boolean(session?.user?.id)}
        canOpenAdmin={canOpenAdmin}
        mascot={mascot}
      />

      <div className="flex min-h-dvh flex-col pb-20 lg:pb-0 lg:pl-[72px]">
        {settings.maintenance_mode && (
          <p className="bg-yellow-500/15 px-4 py-2 text-center text-xs font-medium text-yellow-500">
            Đang bật chế độ bảo trì — khách truy cập không xem được trang này.
          </p>
        )}
        <SiteHeader
          searchQuery={searchQuery}
          session={session}
          mascot={mascot}
          siteName={settings.site_name}
          logoMode={logoMode}
          logoText={settings.site_logo_text}
          logoImage={settings.site_logo_image}
        />

        <main className="w-full min-w-0 flex-1 px-3 pb-8 sm:px-4 lg:px-6">
          {children}
        </main>

        <SiteFooter siteName={settings.site_name} siteDescription={settings.site_description} />
      </div>
      <BackToTop />
    </div>
  );
}

import { PageHeader } from "@/components/admin/page-header";
import { WallpaperForm } from "@/components/admin/wallpaper-form";

export const metadata = { title: "Tải lên hình nền" };

export default function UploadWallpaperPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="🖼️ Tải lên hình nền" description="Thêm hình nền hoặc video nền mới" />
      <WallpaperForm />
    </div>
  );
}

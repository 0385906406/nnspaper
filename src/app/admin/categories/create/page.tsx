import { PageHeader } from "@/components/admin/page-header";
import { CategoryForm } from "@/components/admin/category-form";

export const metadata = { title: "Tạo danh mục" };

export default function CreateCategoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="📁 Tạo danh mục" description="Thêm chủ đề mới cho kho hình nền" />
      <CategoryForm />
    </div>
  );
}

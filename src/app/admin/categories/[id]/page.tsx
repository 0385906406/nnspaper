import mongoose from "mongoose";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { CategoryForm, type CategoryFormValues } from "@/components/admin/category-form";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/models/Category";

export const metadata = { title: "Sửa danh mục" };

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  await connectDB();
  const doc = await Category.findById(id).lean();
  if (!doc) notFound();

  const raw = doc as unknown as Record<string, never>;
  const initial: CategoryFormValues = {
    _id: String(raw._id),
    name: raw.name ?? "",
    slug: raw.slug ?? "",
    icon: raw.icon ?? "🎨",
    description: raw.description ?? "",
    order: raw.order ?? 0,
    parent: raw.parentId ? String(raw.parentId) : "",
  };

  return (
    <div className="space-y-6">
      <PageHeader title="✏️ Sửa danh mục" description={initial.name} />
      <CategoryForm initial={initial} />
    </div>
  );
}

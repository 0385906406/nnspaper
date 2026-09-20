import mongoose from "mongoose";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { WallpaperForm, type WallpaperFormValues } from "@/components/admin/wallpaper-form";
import { WallpaperInteractions } from "@/components/admin/wallpaper-interactions";
import { connectDB } from "@/lib/mongodb";
import { Wallpaper } from "@/models/Wallpaper";

export const metadata = { title: "Sửa hình nền" };

export default async function EditWallpaperPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  await connectDB();
  const doc = await Wallpaper.findById(id).lean();
  if (!doc) notFound();

  // Server Component không truyền được ObjectId/Date sang client, phải làm phẳng trước
  const raw = doc as unknown as Record<string, never>;
  const initial: WallpaperFormValues = {
    _id: String(raw._id),
    title: raw.title ?? "",
    slug: raw.slug ?? "",
    description: raw.description ?? "",
    categorySlug: raw.categorySlug ?? "",
    deviceType: raw.deviceType ?? "both",
    mediaType: raw.mediaType ?? "image",
    media: raw.media ? JSON.parse(JSON.stringify(raw.media)) : null,
    thumbnail: raw.thumbnail ? JSON.parse(JSON.stringify(raw.thumbnail)) : null,
    resolutionLabel: raw.resolutionLabel ?? "",
    tags: raw.tags ?? [],
    source: raw.source ?? "",
    status: raw.status ?? "draft",
    allowComments: raw.allowComments ?? true,
  };

  return (
    <div className="space-y-6">
      <PageHeader title="✏️ Sửa hình nền" description={initial.title} />
      <WallpaperForm initial={initial} />
      <WallpaperInteractions
        wallpaperId={initial._id!}
        slug={initial.slug}
        views={Number(raw.views ?? 0)}
        downloads={Number(raw.downloads ?? 0)}
        likes={Number(raw.likes ?? 0)}
      />
    </div>
  );
}

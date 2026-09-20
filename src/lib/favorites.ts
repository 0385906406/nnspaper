import "server-only";
import { withDb } from "@/lib/data-source";
import { Favorite } from "@/models/Favorite";
import { Wallpaper } from "@/models/Wallpaper";
import { toWallpaperView, type WallpaperView } from "@/lib/wallpapers";
import { getMockFavoriteWallpapers, isMockFavorited, toggleMockFavorite } from "@/lib/mock-data";

export async function isFavorited(userId: string, wallpaperSlug: string): Promise<boolean> {
  return withDb(
    async () => {
      const doc = await Favorite.findOne({ userId, wallpaperSlug }).lean();
      return Boolean(doc);
    },
    () => isMockFavorited(userId, wallpaperSlug)
  );
}

/** Bật/tắt yêu thích, trả về trạng thái mới. */
export async function toggleFavorite(userId: string, wallpaperSlug: string): Promise<boolean> {
  return withDb(
    async () => {
      const existing = await Favorite.findOne({ userId, wallpaperSlug }).lean();
      if (existing) {
        await Favorite.deleteOne({ userId, wallpaperSlug });
        return false;
      }
      await Favorite.create({ userId, wallpaperSlug });
      return true;
    },
    () => toggleMockFavorite(userId, wallpaperSlug)
  );
}

export async function getFavoriteWallpapers(userId: string): Promise<WallpaperView[]> {
  return withDb(
    async () => {
      const favorites = await Favorite.find({ userId }).sort({ createdAt: -1 }).lean();
      const slugs = favorites.map((f) => f.wallpaperSlug);
      if (!slugs.length) return [];

      const docs = await Wallpaper.find({ slug: { $in: slugs }, status: "published" }).lean();
      const bySlug = new Map(docs.map((d) => [d.slug, d]));
      return slugs
        .map((slug) => bySlug.get(slug))
        .filter((d): d is NonNullable<typeof d> => Boolean(d))
        .map((d) => toWallpaperView(d as Record<string, unknown>));
    },
    () => getMockFavoriteWallpapers(userId)
  );
}

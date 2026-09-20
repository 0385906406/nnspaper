import "server-only";
import { withDb } from "@/lib/data-source";
import { Wallpaper } from "@/models/Wallpaper";
import { WallpaperLike } from "@/models/WallpaperLike";
import { hasMockLiked, toggleMockLike } from "@/lib/mock-data";

export async function hasLiked(userId: string, wallpaperSlug: string): Promise<boolean> {
  return withDb(
    async () => Boolean(await WallpaperLike.exists({ userId, wallpaperSlug })),
    () => hasMockLiked(userId, wallpaperSlug)
  );
}

/**
 * Thả tim / bỏ tim. Bản ghi WallpaperLike là nguồn sự thật (unique theo user +
 * hình nền), bộ đếm `likes` chỉ tăng/giảm khi bản ghi thực sự được tạo/xoá —
 * bấm dồn dập hai request cùng lúc cũng không làm lệch số.
 */
export async function toggleLike(
  userId: string,
  wallpaperSlug: string
): Promise<{ liked: boolean; likes: number } | null> {
  return withDb(
    async () => {
      const wallpaper = await Wallpaper.exists({ slug: wallpaperSlug, status: "published" });
      if (!wallpaper) return null;

      const removed = await WallpaperLike.deleteOne({ userId, wallpaperSlug });
      let liked = false;

      if (removed.deletedCount) {
        await Wallpaper.updateOne({ slug: wallpaperSlug, likes: { $gt: 0 } }, { $inc: { likes: -1 } });
      } else {
        try {
          await WallpaperLike.create({ userId, wallpaperSlug });
          await Wallpaper.updateOne({ slug: wallpaperSlug }, { $inc: { likes: 1 } });
        } catch (error) {
          // Request song song đã tạo trước — coi như đã tim, không tăng thêm
          if ((error as { code?: number }).code !== 11000) throw error;
        }
        liked = true;
      }

      const doc = await Wallpaper.findOne({ slug: wallpaperSlug })
        .select({ likes: 1 })
        .lean<{ likes: number } | null>();
      return { liked, likes: doc?.likes ?? 0 };
    },
    () => toggleMockLike(userId, wallpaperSlug)
  );
}

export type LikerView = {
  userId: string;
  name: string;
  email: string;
  /** Nhân vật của người thả tim — dùng làm avatar. */
  mascot: string;
  likedAt: string;
};

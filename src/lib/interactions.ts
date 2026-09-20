import "server-only";
import { Comment } from "@/models/Comment";
import { Favorite } from "@/models/Favorite";
import { Wallpaper } from "@/models/Wallpaper";
import { WallpaperLike } from "@/models/WallpaperLike";
import { syncCommentCount } from "@/lib/comments";

/**
 * Tim, bình luận và yêu thích đều gắn với hình nền qua slug. Đổi slug mà không
 * dời theo thì các tương tác cũ "mồ côi" và biến mất khỏi trang chi tiết.
 */
export async function renameWallpaperSlug(oldSlug: string, newSlug: string): Promise<void> {
  if (oldSlug === newSlug) return;
  await Promise.all([
    Comment.updateMany({ wallpaperSlug: oldSlug }, { $set: { wallpaperSlug: newSlug } }),
    WallpaperLike.updateMany({ wallpaperSlug: oldSlug }, { $set: { wallpaperSlug: newSlug } }),
    Favorite.updateMany({ wallpaperSlug: oldSlug }, { $set: { wallpaperSlug: newSlug } }),
  ]);
}

/** Đổi tiêu đề thì cập nhật luôn tiêu đề lưu kèm trong bình luận (dùng ở trang quản trị). */
export async function renameWallpaperTitle(slug: string, title: string): Promise<void> {
  await Comment.updateMany({ wallpaperSlug: slug }, { $set: { wallpaperTitle: title } });
}

/** Dọn mọi tương tác của một hình nền đã bị xoá. */
export async function purgeWallpaperInteractions(slug: string): Promise<void> {
  await Promise.all([
    Comment.deleteMany({ wallpaperSlug: slug }),
    WallpaperLike.deleteMany({ wallpaperSlug: slug }),
    Favorite.deleteMany({ wallpaperSlug: slug }),
  ]);
}

/**
 * Dọn tương tác của một tài khoản đã bị xoá, và trả lại bộ đếm tim/bình luận
 * cho các hình nền người đó từng tương tác.
 */
export async function purgeUserInteractions(userId: string): Promise<void> {
  const [likes, commentSlugs] = await Promise.all([
    WallpaperLike.find({ userId }).select({ wallpaperSlug: 1 }).lean<{ wallpaperSlug: string }[]>(),
    Comment.distinct("wallpaperSlug", { userId }),
  ]);

  await Promise.all([
    WallpaperLike.deleteMany({ userId }),
    Comment.deleteMany({ userId }),
    Favorite.deleteMany({ userId }),
  ]);

  const likedSlugs = likes.map((l) => l.wallpaperSlug);
  if (likedSlugs.length) {
    await Wallpaper.updateMany(
      { slug: { $in: likedSlugs }, likes: { $gt: 0 } },
      { $inc: { likes: -1 } }
    );
  }
  if (commentSlugs.length) await syncCommentCount(commentSlugs as string[]);
}

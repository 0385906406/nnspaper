import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Một lượt "thả tim" của người dùng cho một hình nền. Mỗi người chỉ tim được
 * một lần (index unique), bấm lần nữa là bỏ tim — nhờ vậy bộ đếm `likes` trên
 * Wallpaper không bị bơm bằng cách bấm liên tục.
 */
const WallpaperLikeSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    wallpaperSlug: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

WallpaperLikeSchema.index({ userId: 1, wallpaperSlug: 1 }, { unique: true });
WallpaperLikeSchema.index({ wallpaperSlug: 1, createdAt: -1 });

export type WallpaperLikeDoc = InferSchemaType<typeof WallpaperLikeSchema> & { _id: string };

export const WallpaperLike: Model<WallpaperLikeDoc> =
  (models.WallpaperLike as Model<WallpaperLikeDoc>) ??
  model<WallpaperLikeDoc>("WallpaperLike", WallpaperLikeSchema);

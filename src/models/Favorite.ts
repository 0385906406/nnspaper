import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** Một lượt "lưu yêu thích" của người dùng đã đăng nhập cho một hình nền cụ thể. */
const FavoriteSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    wallpaperSlug: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

FavoriteSchema.index({ userId: 1, wallpaperSlug: 1 }, { unique: true });

export type FavoriteDoc = InferSchemaType<typeof FavoriteSchema> & { _id: string };

export const Favorite: Model<FavoriteDoc> =
  (models.Favorite as Model<FavoriteDoc>) ?? model<FavoriteDoc>("Favorite", FavoriteSchema);

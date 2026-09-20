import mongoose, { Schema } from "mongoose";

/**
 * Nhân vật do admin tự thêm.
 *
 * 57 nhân vật gốc vẫn nằm trong `src/lib/mascots.ts` với sprite trong `public/`.
 * Cố ý không chuyển chúng vào DB: không phải migrate gì, và nếu DB lỗi thì trang
 * chọn nhân vật vẫn còn đủ bộ gốc để dùng.
 *
 * Sprite của nhân vật tuỳ chỉnh phải nằm trên Cloudinary chứ không phải `public/`,
 * vì file trong `public/` chỉ vào được khi deploy — admin không thêm lúc đang chạy.
 */

const SheetSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

export const MASCOT_GROUP_KEYS = ["animal", "people", "robot", "style"] as const;

const mascotSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    group: { type: String, enum: MASCOT_GROUP_KEYS, default: "animal" },
    /** Sprite 3×3 chín hướng nhìn. */
    directions: { type: SheetSchema, required: true },
    /** Sprite 3×3 chín biểu cảm. */
    reactions: { type: SheetSchema, required: true },
    // Tắt thay vì xoá để người dùng đang chọn nhân vật đó không mất avatar
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const Mascot = mongoose.models.Mascot || mongoose.model("Mascot", mascotSchema);

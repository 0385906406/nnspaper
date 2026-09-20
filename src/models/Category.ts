import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Chủ đề (category) dùng để phân loại hình nền, ví dụ: Anime, Game, Phong cảnh...
 * Danh sách category hiển thị ở sidebar/filter và không phụ thuộc vào thiết bị
 * (PC/Phone chỉ lọc theo `Wallpaper.deviceType`, không tách theo category).
 */
const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: { type: String, default: "", maxlength: 500 },
    // Emoji hoặc tên icon ngắn hiển thị cạnh tên category trên sidebar
    icon: { type: String, default: "" },

    /**
     * Danh mục cha, null nghĩa là cấp trên cùng. Chỉ cho phép 2 cấp (vd:
     * "One Piece" > "Luffy"); cấp ba làm thanh điều hướng và truy vấn phức tạp
     * lên nhiều mà người dùng kho hình nền hầu như không cần.
     */
    parentId: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    // Thứ tự hiển thị thủ công trên sidebar (nhỏ hơn hiện trước)
    order: { type: Number, default: 0, index: true },

    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
      keywords: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);

export type CategoryDoc = InferSchemaType<typeof CategorySchema> & { _id: string };

export const Category: Model<CategoryDoc> =
  (models.Category as Model<CategoryDoc>) ?? model<CategoryDoc>("Category", CategorySchema);

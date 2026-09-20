import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** Một bình luận của người dùng đã đăng nhập dưới một hình nền. */
const CommentSchema = new Schema(
  {
    wallpaperSlug: { type: String, required: true, index: true },
    // Lưu kèm tiêu đề để trang quản trị hiện được mà không phải tra từng hình nền
    wallpaperTitle: { type: String, default: "" },
    userId: { type: String, required: true, index: true },
    // Tên tại thời điểm bình luận — bình luận vẫn đọc được sau khi user đổi tên hay bị xoá.
    // Avatar không lưu ở đây: luôn lấy theo nhân vật hiện tại của người viết.
    userName: { type: String, default: "" },
    content: { type: String, required: true, trim: true, maxlength: 500 },
    // "hidden" do quản trị viên ẩn: không hiện ngoài trang nhưng vẫn giữ lại để xem xét
    status: {
      type: String,
      enum: ["visible", "hidden"],
      default: "visible",
      index: true,
    },
  },
  { timestamps: true }
);

CommentSchema.index({ wallpaperSlug: 1, status: 1, createdAt: -1 });
CommentSchema.index({ content: "text", userName: "text" });

export type CommentDoc = InferSchemaType<typeof CommentSchema> & { _id: string };

export const Comment: Model<CommentDoc> =
  (models.Comment as Model<CommentDoc>) ?? model<CommentDoc>("Comment", CommentSchema);

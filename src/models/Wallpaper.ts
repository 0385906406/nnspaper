import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { buildSearchText } from "@/lib/search-text";

/**
 * Một file ảnh/video đang nằm trên Cloudinary.
 * DB chỉ giữ đường dẫn và metadata, không giữ file nhị phân.
 */
const MediaSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    resourceType: {
      type: String,
      enum: ["image", "video"],
      default: "image",
    },
    width: Number,
    height: Number,
    format: String,
    bytes: Number,
    duration: Number, // chỉ có với video
    // Nơi file thực sự nằm. Bản ghi cũ không có trường này nên mặc định là
    // cloudinary — đúng với mọi file đã tải lên trước khi tách video sang R2.
    provider: { type: String, enum: ["cloudinary", "r2"], default: "cloudinary" },
    // alt rất quan trọng cho SEO ảnh và cho trình đọc màn hình
    alt: { type: String, default: "" },
  },
  { _id: false }
);

const WallpaperSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    // slug là URL của hình nền -> phải duy nhất và có index
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: { type: String, default: "", maxlength: 500 },

    category: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    // Denormalize để trang danh sách không phải populate mỗi lần render
    categoryName: { type: String, required: true },
    categorySlug: { type: String, required: true, index: true },

    // Thiết bị phù hợp: ảnh ngang cho PC, ảnh dọc cho điện thoại, hoặc dùng được cả hai
    deviceType: {
      type: String,
      enum: ["pc", "phone", "both"],
      default: "both",
      index: true,
    },
    // Ảnh tĩnh hay video (hình nền động/live wallpaper)
    mediaType: {
      type: String,
      enum: ["image", "video"],
      required: true,
      index: true,
    },

    media: { type: MediaSchema, required: true },
    // Ảnh đại diện cho video (poster) — bắt buộc khi mediaType = "video" để hiển thị card nhanh, đỡ tốn băng thông
    thumbnail: { type: MediaSchema, default: null },

    // Nhãn độ phân giải hiển thị dạng badge, ví dụ "4K UHD", "2K", "FHD"
    resolutionLabel: { type: String, default: "" },

    tags: { type: [String], default: [], index: true },
    // Tiêu đề + tag + danh mục + mô tả đã bỏ dấu, viết thường — phục vụ tìm kiếm
    // gõ không dấu / gõ một phần. Tự tính lại khi lưu (xem hook bên dưới).
    searchText: { type: String, default: "" },
    // Nguồn/credit ảnh, hiển thị ở trang chi tiết
    source: { type: String, default: "" },

    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    // Số bình luận đang hiển thị — đếm sẵn để danh sách không phải đếm lại mỗi lần
    commentCount: { type: Number, default: 0 },
    // Tắt thì trang chi tiết báo "Đã tắt nhận xét" và API từ chối bình luận mới
    allowComments: { type: Boolean, default: true },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },
    publishedAt: { type: Date, default: null },

    // Cho phép ghi đè thẻ meta của từng hình nền khi cần tối ưu riêng
    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
      keywords: { type: [String], default: [] },
      canonical: { type: String, default: "" },
      noindex: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// Index toàn văn cũ, giữ lại cho truy vấn ngoài; thanh tìm kiếm dùng searchText
WallpaperSchema.index({ title: "text", description: "text", tags: "text" });

// Tạo mới / .save() thì tự tính searchText. Các lệnh update hàng loạt phải gọi
// syncSearchText() trong lib/wallpapers vì hook save không chạy với chúng.
WallpaperSchema.pre("save", function () {
  this.searchText = buildSearchText(this);
});
// Index phục vụ trang chủ / trang category: đã đăng, đúng thiết bị, mới nhất trước
WallpaperSchema.index({ status: 1, deviceType: 1, categorySlug: 1, publishedAt: -1 });
WallpaperSchema.index({ status: 1, publishedAt: -1 });

export type WallpaperDoc = InferSchemaType<typeof WallpaperSchema> & { _id: string };

/**
 * `models.Wallpaper ?? model(...)` là bắt buộc với Next.js: hot-reload sẽ chạy lại
 * file này nhiều lần, và mongoose ném lỗi OverwriteModelError nếu đăng ký trùng tên.
 */
export const Wallpaper: Model<WallpaperDoc> =
  (models.Wallpaper as Model<WallpaperDoc>) ??
  model<WallpaperDoc>("Wallpaper", WallpaperSchema);

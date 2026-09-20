import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Một lượt tìm kiếm trên trang công khai. Chỉ lưu từ khoá và số kết quả — không
 * lưu người tìm hay IP. Tự xoá sau 90 ngày (TTL) để collection không phình mãi.
 */
const SearchLogSchema = new Schema(
  {
    /** Từ khoá đã chuẩn hoá (bỏ dấu, viết thường) — dùng để gộp thống kê. */
    term: { type: String, required: true, index: true },
    /** Cách người dùng gõ gần nhất, để hiển thị cho đẹp. */
    display: { type: String, required: true },
    results: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

SearchLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });
SearchLogSchema.index({ createdAt: -1, term: 1 });

export type SearchLogDoc = InferSchemaType<typeof SearchLogSchema> & { _id: string };

export const SearchLog: Model<SearchLogDoc> =
  (models.SearchLog as Model<SearchLogDoc>) ?? model<SearchLogDoc>("SearchLog", SearchLogSchema);

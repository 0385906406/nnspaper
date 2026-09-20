import mongoose from "mongoose";

export interface SystemSettingsDoc extends mongoose.Document {
  key: string;
  value: unknown;
  type: "string" | "number" | "boolean" | "json" | "url" | "email";
  description: string;
  help: string;
  category: "site" | "display" | "system";
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new mongoose.Schema<SystemSettingsDoc>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    type: {
      type: String,
      enum: ["string", "number", "boolean", "json", "url", "email"],
      default: "string",
    },
    description: { type: String, default: "" },
    category: {
      type: String,
      enum: ["site", "branding", "display", "system"],
      default: "site",
    },
    /** Giải thích ngắn hiện dưới ô nhập trong trang Cài đặt. */
    help: { type: String, default: "" },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

export const SystemSettings =
  mongoose.models.SystemSettings ||
  mongoose.model<SystemSettingsDoc>("SystemSettings", settingsSchema);

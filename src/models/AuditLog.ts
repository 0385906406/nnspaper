import mongoose from "mongoose";

export interface AuditLogDoc extends mongoose.Document {
  userId: string;
  /** Tên người thao tác tại thời điểm đó — lưu kèm để log vẫn đọc được sau khi user bị xoá. */
  userName?: string;
  action: string;
  resource: "user" | "category" | "wallpaper" | "comment" | "setting" | "role";
  resourceId?: string;
  /** Giá trị đã đổi; hình dạng tuỳ theo resource nên chỉ ràng buộc tới mức khoá. */
  changes?: Record<string, unknown>;
  status: "success" | "failed";
  message: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new mongoose.Schema<AuditLogDoc>(
  {
    userId: { type: String, required: true },
    userName: { type: String, default: "" },
    action: { type: String, required: true },
    resource: {
      type: String,
      enum: ["user", "category", "wallpaper", "comment", "setting", "role"],
      required: true,
    },
    resourceId: { type: String },
    changes: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, enum: ["success", "failed"], default: "success" },
    message: { type: String, default: "" },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, createdAt: -1 });

export const AuditLog =
  mongoose.models.AuditLog || mongoose.model<AuditLogDoc>("AuditLog", auditLogSchema);

import mongoose from "mongoose";

export interface PermissionDoc extends mongoose.Document {
  key: string;
  name: string;
  description: string;
  category: "user" | "category" | "wallpaper" | "comment" | "setting" | "role";
  createdAt: Date;
  updatedAt: Date;
}

const permissionSchema = new mongoose.Schema<PermissionDoc>(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    category: {
      type: String,
      enum: ["user", "category", "wallpaper", "comment", "setting", "role"],
      required: true,
    },
  },
  { timestamps: true }
);

export const Permission =
  mongoose.models.Permission || mongoose.model<PermissionDoc>("Permission", permissionSchema);

export const DEFAULT_PERMISSIONS = [
  { key: "user.view", name: "Xem người dùng", category: "user" as const },
  { key: "user.create", name: "Tạo người dùng", category: "user" as const },
  { key: "user.edit", name: "Chỉnh sửa người dùng", category: "user" as const },
  { key: "user.delete", name: "Xóa người dùng", category: "user" as const },

  { key: "category.view", name: "Xem danh mục", category: "category" as const },
  { key: "category.create", name: "Tạo danh mục", category: "category" as const },
  { key: "category.edit", name: "Chỉnh sửa danh mục", category: "category" as const },
  { key: "category.delete", name: "Xóa danh mục", category: "category" as const },

  { key: "wallpaper.view", name: "Xem hình nền", category: "wallpaper" as const },
  { key: "wallpaper.create", name: "Tạo hình nền", category: "wallpaper" as const },
  { key: "wallpaper.edit", name: "Chỉnh sửa hình nền", category: "wallpaper" as const },
  { key: "wallpaper.delete", name: "Xóa hình nền", category: "wallpaper" as const },
  { key: "wallpaper.approve", name: "Duyệt hình nền", category: "wallpaper" as const },

  { key: "comment.view", name: "Xem bình luận", category: "comment" as const },
  { key: "comment.edit", name: "Ẩn/hiện bình luận", category: "comment" as const },
  { key: "comment.delete", name: "Xóa bình luận", category: "comment" as const },

  { key: "setting.view", name: "Xem cài đặt", category: "setting" as const },
  { key: "setting.edit", name: "Chỉnh sửa cài đặt", category: "setting" as const },

  { key: "role.view", name: "Xem vai trò", category: "role" as const },
  { key: "role.create", name: "Tạo vai trò", category: "role" as const },
  { key: "role.edit", name: "Chỉnh sửa vai trò", category: "role" as const },
  { key: "role.delete", name: "Xóa vai trò", category: "role" as const },
];

export const DEFAULT_ROLES = [
  {
    name: "Admin",
    slug: "admin",
    description: "Quản trị viên hệ thống - toàn quyền",
    permissions: DEFAULT_PERMISSIONS.map((p) => p.key),
    isSystem: true,
  },
  {
    name: "Editor",
    slug: "editor",
    description: "Biên tập viên - quản lý nội dung",
    permissions: [
      "wallpaper.view",
      "wallpaper.create",
      "wallpaper.edit",
      "category.view",
      "wallpaper.approve",
      "comment.view",
      "comment.edit",
    ],
    isSystem: true,
  },
  {
    name: "Viewer",
    slug: "viewer",
    description: "Người xem - chỉ đọc",
    permissions: ["wallpaper.view", "category.view"],
    isSystem: true,
  },
];

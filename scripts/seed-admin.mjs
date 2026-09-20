// Seed roles, permissions và tài khoản admin đầu tiên.
// Chạy: node --env-file=.env.local scripts/seed-admin.mjs
// Tuỳ chọn: SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... node --env-file=.env.local scripts/seed-admin.mjs

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Thiếu MONGODB_URI. Hãy tạo .env.local từ .env.example trước.");
  process.exit(1);
}

const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();
const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin@12345";
const adminName = process.env.SEED_ADMIN_NAME || "Admin User";

// Phải khớp DEFAULT_PERMISSIONS trong src/models/Permission.ts — hasPermission()
// so khớp đúng chuỗi này, sai key thì editor/viewer mất sạch quyền.
const PERMISSIONS = [
  { key: "user.view", name: "Xem người dùng", category: "user" },
  { key: "user.create", name: "Tạo người dùng", category: "user" },
  { key: "user.edit", name: "Chỉnh sửa người dùng", category: "user" },
  { key: "user.delete", name: "Xóa người dùng", category: "user" },
  { key: "category.view", name: "Xem danh mục", category: "category" },
  { key: "category.create", name: "Tạo danh mục", category: "category" },
  { key: "category.edit", name: "Chỉnh sửa danh mục", category: "category" },
  { key: "category.delete", name: "Xóa danh mục", category: "category" },
  { key: "wallpaper.view", name: "Xem hình nền", category: "wallpaper" },
  { key: "wallpaper.create", name: "Tạo hình nền", category: "wallpaper" },
  { key: "wallpaper.edit", name: "Chỉnh sửa hình nền", category: "wallpaper" },
  { key: "wallpaper.delete", name: "Xóa hình nền", category: "wallpaper" },
  { key: "wallpaper.approve", name: "Duyệt hình nền", category: "wallpaper" },
  { key: "comment.view", name: "Xem bình luận", category: "comment" },
  { key: "comment.edit", name: "Ẩn/hiện bình luận", category: "comment" },
  { key: "comment.delete", name: "Xóa bình luận", category: "comment" },
  { key: "setting.view", name: "Xem cài đặt", category: "setting" },
  { key: "setting.edit", name: "Chỉnh sửa cài đặt", category: "setting" },
  { key: "role.view", name: "Xem vai trò", category: "role" },
  { key: "role.create", name: "Tạo vai trò", category: "role" },
  { key: "role.edit", name: "Chỉnh sửa vai trò", category: "role" },
  { key: "role.delete", name: "Xóa vai trò", category: "role" },
];

const ROLES = [
  {
    name: "Admin",
    slug: "admin",
    description: "Quản trị viên hệ thống - toàn quyền",
    permissions: PERMISSIONS.map((p) => p.key),
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
      "wallpaper.approve",
      "category.view",
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

async function main() {
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || undefined });
  const db = mongoose.connection.db;
  const now = new Date();

  console.log("Seed permissions...");
  for (const perm of PERMISSIONS) {
    await db
      .collection("permissions")
      .updateOne(
        { key: perm.key },
        { $set: { ...perm, updatedAt: now }, $setOnInsert: { createdAt: now } },
        { upsert: true }
      );
  }
  console.log(`  ${PERMISSIONS.length} permissions`);

  console.log("Seed roles...");
  for (const role of ROLES) {
    await db
      .collection("roles")
      .updateOne(
        { slug: role.slug },
        { $set: { ...role, updatedAt: now }, $setOnInsert: { createdAt: now } },
        { upsert: true }
      );
    console.log(`  ${role.slug} (${role.permissions.length} quyền)`);
  }

  console.log("Seed admin user...");
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  await db.collection("users").updateOne(
    { email: adminEmail },
    {
      $set: {
        email: adminEmail,
        name: adminName,
        password: hashedPassword,
        // role lưu dạng slug (chuỗi), không phải ObjectId của bảng roles
        role: "admin",
        isActive: true,
        emailVerified: now,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  console.log("\nXong.");
  console.log(`  Email:    ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  console.log("\nHãy đổi mật khẩu sau lần đăng nhập đầu tiên.");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

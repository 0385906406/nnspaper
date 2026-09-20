// Bổ sung quyền quản lý bình luận cho DB đã seed từ trước, KHÔNG đụng tới
// tài khoản/mật khẩu (khác seed-admin.mjs). Chạy lại nhiều lần vẫn an toàn.
// Chạy: node --env-file=.env.local scripts/seed-comments.mjs

import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Thiếu MONGODB_URI. Hãy tạo .env.local từ .env.example trước.");
  process.exit(1);
}

// Phải khớp DEFAULT_PERMISSIONS trong src/models/Permission.ts
const PERMISSIONS = [
  { key: "comment.view", name: "Xem bình luận", category: "comment" },
  { key: "comment.edit", name: "Ẩn/hiện bình luận", category: "comment" },
  { key: "comment.delete", name: "Xóa bình luận", category: "comment" },
];

const GRANTS = {
  admin: PERMISSIONS.map((p) => p.key),
  editor: ["comment.view", "comment.edit"],
};

async function main() {
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || undefined });
  const db = mongoose.connection.db;
  const now = new Date();

  for (const perm of PERMISSIONS) {
    await db
      .collection("permissions")
      .updateOne(
        { key: perm.key },
        { $set: { ...perm, updatedAt: now }, $setOnInsert: { createdAt: now } },
        { upsert: true }
      );
  }
  console.log(`Đã thêm ${PERMISSIONS.length} quyền bình luận.`);

  for (const [slug, keys] of Object.entries(GRANTS)) {
    const res = await db
      .collection("roles")
      .updateOne({ slug }, { $addToSet: { permissions: { $each: keys } }, $set: { updatedAt: now } });
    console.log(`  ${slug}: ${res.matchedCount ? `cấp ${keys.join(", ")}` : "chưa có vai trò này, bỏ qua"}`);
  }

  const wallpapers = db.collection("wallpapers");
  const comments = db.collection("comments");

  await wallpapers.updateMany({ allowComments: { $exists: false } }, { $set: { allowComments: true } });

  // Bình luận tạo trước khi có kiểm duyệt: thiếu status và tiêu đề hình nền
  const noStatus = await comments.updateMany({ status: { $exists: false } }, { $set: { status: "visible" } });
  const titles = new Map(
    (await wallpapers.find({}, { projection: { slug: 1, title: 1 } }).toArray()).map((w) => [w.slug, w.title])
  );
  for (const slug of await comments.distinct("wallpaperSlug", { wallpaperTitle: { $in: [null, ""] } })) {
    await comments.updateMany(
      { wallpaperSlug: slug, wallpaperTitle: { $in: [null, ""] } },
      { $set: { wallpaperTitle: titles.get(slug) ?? "" } }
    );
  }
  console.log(`Bổ sung trạng thái cho ${noStatus.modifiedCount} bình luận cũ.`);

  // Lượt tim từ phiên bản trước nằm ở collection "likes" (cùng cấu trúc). Bộ đếm
  // likes trên hình nền đã tính các lượt này nên chỉ chép bản ghi, không cộng thêm.
  let copied = 0;
  for (const like of await db.collection("likes").find({}).toArray()) {
    const res = await db.collection("wallpaperlikes").updateOne(
      { userId: like.userId, wallpaperSlug: like.wallpaperSlug },
      { $setOnInsert: { userId: like.userId, wallpaperSlug: like.wallpaperSlug, createdAt: like.createdAt ?? now, updatedAt: now } },
      { upsert: true }
    );
    copied += res.upsertedCount;
  }
  console.log(`Chép ${copied} lượt tim cũ sang wallpaperlikes.`);

  // Đếm lại số bình luận đang hiện cho mọi hình nền
  const counts = new Map(
    (
      await comments
        .aggregate([{ $match: { status: { $ne: "hidden" } } }, { $group: { _id: "$wallpaperSlug", n: { $sum: 1 } } }])
        .toArray()
    ).map((c) => [c._id, c.n])
  );
  for (const slug of titles.keys()) {
    await wallpapers.updateOne({ slug }, { $set: { commentCount: counts.get(slug) ?? 0 } });
  }
  console.log(`Đồng bộ số bình luận cho ${titles.size} hình nền.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

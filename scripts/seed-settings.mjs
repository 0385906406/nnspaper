// Khởi tạo / đồng bộ cài đặt hệ thống trong DB.
// Chạy: node --env-file=.env.local scripts/seed-settings.mjs
//
// Nhãn và kiểu luôn ghi đè theo code; riêng giá trị chỉ đặt khi tạo mới, nên
// chạy lại nhiều lần không làm mất thiết lập admin đã chỉnh.

import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Thiếu MONGODB_URI. Hãy tạo .env.local từ .env.example trước.");
  process.exit(1);
}

// Phải khớp SETTING_DEFS trong src/lib/settings.ts
const SETTINGS = [
  {
    key: "site_name",
    value: "nnspaper",
    type: "string",
    category: "site",
    description: "Tên trang web",
    help: "Hiện ở logo đầu trang, chân trang, tiêu đề tab và dữ liệu SEO.",
  },
  {
    key: "site_logo_mode",
    value: "text",
    type: "string",
    category: "branding",
    description: "Kiểu logo",
    help: "Chọn hiển thị bằng chữ hay bằng ảnh.",
  },
  {
    key: "site_logo_text",
    value: "nns",
    type: "string",
    category: "branding",
    description: "Chữ trên logo",
    help: "Hiện nguyên văn trong ô logo vuông. Để ngắn (1–4 ký tự) thì cân đối nhất.",
  },
  {
    key: "site_logo_image",
    value: "",
    type: "url",
    category: "branding",
    description: "Ảnh logo",
    help: "Chọn file từ máy hoặc dán URL. Nên dùng ảnh vuông, nền trong suốt.",
  },
  {
    key: "site_favicon",
    value: "",
    type: "url",
    category: "branding",
    description: "Favicon",
    help: "Biểu tượng nhỏ trên tab trình duyệt. Ảnh vuông 32–512px, png hoặc svg.",
  },
  {
    key: "site_description",
    value:
      "Kho hình nền và video nền (live wallpaper) 4K miễn phí cho điện thoại và máy tính, phân loại theo chủ đề: Anime, Game, Phong cảnh, Dark/Creepy và nhiều hơn nữa.",
    type: "string",
    category: "site",
    description: "Mô tả trang web",
    help: "Dùng cho thẻ meta description, chia sẻ mạng xã hội và đoạn giới thiệu ở chân trang.",
  },
  {
    key: "site_keywords",
    value: [
      "hình nền 4k",
      "hình nền động",
      "live wallpaper",
      "hình nền điện thoại",
      "hình nền máy tính",
    ],
    type: "json",
    category: "site",
    description: "Từ khoá SEO",
    help: "Mảng chuỗi, đưa vào thẻ meta keywords.",
  },
  {
    key: "contact_email",
    value: "hello@your-domain.com",
    type: "email",
    category: "site",
    description: "Email liên hệ",
    help: "Hiện ở trang Liên hệ để người dùng góp ý hoặc yêu cầu gỡ ảnh.",
  },
  {
    key: "wallpapers_per_page",
    value: 8,
    type: "number",
    category: "display",
    description: "Số hình nền mỗi trang",
    help: "Áp dụng cho trang chủ, trang chủ đề và trang thịnh hành.",
  },
  {
    key: "allow_registration",
    value: true,
    type: "boolean",
    category: "system",
    description: "Cho phép đăng ký tài khoản",
    help: "Tắt thì trang đăng ký báo tạm khoá và API đăng ký từ chối yêu cầu mới.",
  },
  {
    key: "comments_enabled",
    value: true,
    type: "boolean",
    category: "system",
    description: "Cho phép bình luận",
    help: "Tắt thì toàn bộ trang chi tiết ngừng nhận bình luận mới (bình luận cũ vẫn hiện).",
  },
  {
    key: "maintenance_mode",
    value: false,
    type: "boolean",
    category: "system",
    description: "Chế độ bảo trì",
    help: "Bật thì khách chỉ thấy trang thông báo bảo trì. Quản trị viên vẫn vào bình thường.",
  },
  {
    key: "maintenance_message",
    value: "Trang đang được bảo trì để nâng cấp. Vui lòng quay lại sau ít phút.",
    type: "string",
    category: "system",
    description: "Nội dung trang bảo trì",
    help: "Câu thông báo hiển thị cho khách khi bật chế độ bảo trì.",
  },
];

async function main() {
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || undefined });
  const col = mongoose.connection.db.collection("systemsettings");
  const now = new Date();

  for (const { key, value, ...meta } of SETTINGS) {
    await col.updateOne(
      { key },
      { $set: { ...meta, updatedAt: now }, $setOnInsert: { key, value, createdAt: now } },
      { upsert: true }
    );
  }

  const removed = await col.deleteMany({ key: { $nin: SETTINGS.map((s) => s.key) } });
  if (removed.deletedCount) {
    console.log(`Đã xoá ${removed.deletedCount} cài đặt không còn dùng.`);
  }

  console.log(`Xong: ${SETTINGS.length} cài đặt.`);
  for (const s of await col.find({}).sort({ category: 1, key: 1 }).toArray()) {
    console.log(`  [${s.category}] ${s.key} = ${JSON.stringify(s.value)}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

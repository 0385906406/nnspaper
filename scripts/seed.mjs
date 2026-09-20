// Script tạo dữ liệu mẫu (category + wallpaper) để xem giao diện khi chưa có nội dung thật.
// Ảnh dùng picsum.photos (đặt seed cố định để ảnh không đổi giữa các lần chạy) — hãy thay
// bằng ảnh/video thật trên Cloudinary trước khi lên production.
//
// Chạy: npm run seed  (cần MONGODB_URI trong .env.local)
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Thiếu MONGODB_URI. Hãy tạo .env.local từ .env.example trước.");
  process.exit(1);
}

const CATEGORIES = [
  { name: "Anime", slug: "anime", icon: "🎌", order: 1, description: "Hình nền nhân vật và bối cảnh anime." },
  { name: "Game", slug: "game", icon: "🎮", order: 2, description: "Hình nền lấy cảm hứng từ các tựa game nổi tiếng." },
  { name: "Viễn tưởng", slug: "vien-tuong", icon: "🚀", order: 3, description: "Không gian, khoa học viễn tưởng, thế giới giả tưởng." },
  { name: "Dark / Creepy", slug: "dark-creepy", icon: "🌑", order: 4, description: "Hình nền tối màu, ma mị, huyền bí." },
  { name: "Phong cảnh", slug: "phong-canh", icon: "🏞️", order: 5, description: "Thiên nhiên, núi non, hoàng hôn, biển cả." },
  { name: "Phương tiện giao thông", slug: "phuong-tien", icon: "🚗", order: 6, description: "Xe hơi, mô tô, máy bay tốc độ cao." },
  { name: "Pixel", slug: "pixel", icon: "🕹️", order: 7, description: "Nghệ thuật pixel art hoài cổ." },
  { name: "Người", slug: "nguoi", icon: "🧑", order: 8, description: "Chân dung và nhân vật." },
  { name: "Thư giãn", slug: "thu-gian", icon: "🌿", order: 9, description: "Khung cảnh nhẹ nhàng, thư thái." },
];

function pcImage(seed) {
  return { url: `https://picsum.photos/seed/${seed}/1920/1080`, width: 1920, height: 1080 };
}
function phoneImage(seed) {
  return { url: `https://picsum.photos/seed/${seed}/1080/1920`, width: 1080, height: 1920 };
}

function image(seed, device) {
  const dim = device === "phone" ? phoneImage(seed) : pcImage(seed);
  return {
    url: dim.url,
    publicId: `seed/${seed}`,
    resourceType: "image",
    width: dim.width,
    height: dim.height,
    format: "jpg",
    bytes: 1_800_000 + Math.floor(Math.random() * 6_000_000),
    alt: seed.replace(/-/g, " "),
  };
}

const WALLPAPERS = [
  {
    title: "Furina áo hoodie dưới nắng graffiti",
    categorySlug: "anime",
    deviceType: "pc",
    mediaType: "image",
    resolutionLabel: "4K UHD",
    tags: ["anime", "genshin", "furina"],
    source: "Pinterest",
    description: "Cô gái anime mặc hoodie xanh pastel, vui vẻ giơ tay dưới bức tường graffiti rực rỡ.",
    media: image("furina-graffiti", "pc"),
  },
  {
    title: "Tử Đằng Nguyệt Ảnh",
    categorySlug: "phong-canh",
    deviceType: "pc",
    mediaType: "image",
    resolutionLabel: "4K UHD",
    tags: ["phong cảnh", "cổ trang", "thư giãn"],
    description: "Cây cầu đá bắc qua hồ nước tĩnh lặng dưới tán hoa tử đằng, ánh nắng sớm xuyên qua sương mù.",
    media: image("tu-dang-nguyet-anh", "pc"),
  },
  {
    title: "Columbina Genshin",
    categorySlug: "game",
    deviceType: "phone",
    mediaType: "image",
    resolutionLabel: "4K UHD",
    tags: ["genshin", "game", "columbina"],
    description: "Nhân vật Columbina trong trang phục lộng lẫy giữa nền trời đêm đầy sao.",
    media: image("columbina-genshin", "phone"),
  },
  {
    title: "Celestial Dream Concert",
    categorySlug: "game",
    deviceType: "pc",
    mediaType: "image",
    resolutionLabel: "4K UHD",
    tags: ["concert", "game", "âm nhạc"],
    description: "Sân khấu concert lung linh ánh đèn neon tím xanh giữa không gian huyền ảo.",
    media: image("celestial-dream-concert", "pc"),
  },
  {
    title: "Hình nền động cánh cổng Torii",
    categorySlug: "phong-canh",
    deviceType: "both",
    mediaType: "video",
    resolutionLabel: "4K UHD",
    tags: ["nhật bản", "torii", "hoàng hôn"],
    description: "Cổng Torii đỏ nổi bật giữa hoàng hôn hồng tím, núi Phú Sĩ phía xa — video lặp mượt mà.",
    media: {
      url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      publicId: "seed/torii-gate-live",
      resourceType: "video",
      width: 1920,
      height: 1080,
      format: "mp4",
      duration: 10,
      bytes: 4_200_000,
      alt: "Video nền cổng Torii lúc hoàng hôn",
    },
    thumbnail: image("torii-gate-thumb", "pc"),
  },
  {
    title: "Columbina Genshin Impact",
    categorySlug: "anime",
    deviceType: "pc",
    mediaType: "image",
    resolutionLabel: "4K UHD",
    tags: ["anime", "game", "người"],
    description: "Mái tóc dài bay trong gió đêm, ánh trăng bạc phản chiếu trên trang phục cổ trang.",
    media: image("columbina-impact", "pc"),
  },
  {
    title: "Phi thuyền xuyên không gian",
    categorySlug: "vien-tuong",
    deviceType: "pc",
    mediaType: "image",
    resolutionLabel: "4K UHD",
    tags: ["không gian", "phi thuyền", "viễn tưởng"],
    description: "Phi thuyền lướt qua dải ngân hà rực rỡ ánh sao.",
    media: image("spaceship-galaxy", "pc"),
  },
  {
    title: "Rừng ma ám dưới trăng máu",
    categorySlug: "dark-creepy",
    deviceType: "phone",
    mediaType: "image",
    resolutionLabel: "2K",
    tags: ["dark", "creepy", "trăng máu"],
    description: "Khu rừng chết chóc dưới ánh trăng đỏ, sương mù bao phủ lối đi.",
    media: image("blood-moon-forest", "phone"),
  },
  {
    title: "Siêu xe dưới ánh đèn neon",
    categorySlug: "phuong-tien",
    deviceType: "pc",
    mediaType: "image",
    resolutionLabel: "4K UHD",
    tags: ["xe hơi", "neon", "tốc độ"],
    description: "Siêu xe thể thao lướt qua thành phố về đêm với vệt đèn neon dài.",
    media: image("neon-supercar", "pc"),
  },
  {
    title: "Thành phố pixel art hoài cổ",
    categorySlug: "pixel",
    deviceType: "both",
    mediaType: "image",
    resolutionLabel: "FHD",
    tags: ["pixel", "retro", "thành phố"],
    description: "Thành phố về đêm theo phong cách pixel art 16-bit đầy hoài niệm.",
    media: image("pixel-city", "pc"),
  },
  {
    title: "Chân dung cô gái giữa hoa anh đào",
    categorySlug: "nguoi",
    deviceType: "phone",
    mediaType: "image",
    resolutionLabel: "4K UHD",
    tags: ["chân dung", "hoa anh đào", "mùa xuân"],
    description: "Chân dung nhẹ nhàng giữa những cánh hoa anh đào rơi.",
    media: image("sakura-portrait", "phone"),
  },
  {
    title: "Buổi chiều thư giãn bên hồ",
    categorySlug: "thu-gian",
    deviceType: "pc",
    mediaType: "image",
    resolutionLabel: "2K",
    tags: ["thư giãn", "hồ nước", "chiều tà"],
    description: "Băng ghế gỗ bên hồ nước phẳng lặng lúc chiều tà, không khí yên bình.",
    media: image("lakeside-relax", "pc"),
  },
];

// Vài tài khoản mẫu để trang Người dùng và audit log có nội dung để xem
const DEMO_USERS = [
  { email: "editor@example.com", name: "Trần Biên Tập", role: "editor" },
  { email: "viewer@example.com", name: "Lê Thị Xem", role: "viewer" },
  { email: "cong.tac.vien@example.com", name: "Nguyễn Cộng Tác", role: "editor" },
];

async function main() {
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || undefined });
  const db = mongoose.connection.db;
  const categories = db.collection("categories");
  const wallpapers = db.collection("wallpapers");
  const users = db.collection("users");
  const auditLogs = db.collection("auditlogs");

  // Người thực hiện mọi thao tác seed. Không có admin thì audit log sẽ không
  // truy được về ai, nên dừng lại và bảo chạy seed-admin trước.
  const admin = await users.findOne({ role: "admin" });
  if (!admin) {
    console.error("Chưa có tài khoản admin. Chạy `node --env-file=.env.local scripts/seed-admin.mjs` trước.");
    process.exit(1);
  }
  const actor = { userId: admin._id.toString(), userName: admin.name || admin.email };

  // Xoá log seed cũ để chạy lại nhiều lần không bị nhân bản
  const removed = await auditLogs.deleteMany({ "changes._seed": true });
  if (removed.deletedCount) console.log(`Đã xoá ${removed.deletedCount} audit log seed cũ.`);

  const pendingLogs = [];
  let clock = Date.now() - 1000 * 60 * 60 * 24 * 14; // trải log ra 2 tuần gần đây
  function recordLog({ action, resource, resourceId, message, changes = {}, status = "success" }) {
    // Mỗi log cách nhau vài phút để danh sách trông như hoạt động thật
    clock += 1000 * 60 * (7 + Math.floor(Math.random() * 90));
    const at = new Date(Math.min(clock, Date.now()));
    pendingLogs.push({
      ...actor,
      action,
      resource,
      resourceId,
      changes: { ...changes, _seed: true },
      status,
      message,
      ipAddress: "127.0.0.1",
      userAgent: "seed-script",
      createdAt: at,
      updatedAt: at,
    });
  }

  console.log("Seeding users...");
  for (const u of DEMO_USERS) {
    const now = new Date();
    const existing = await users.findOne({ email: u.email });
    const res = await users.findOneAndUpdate(
      { email: u.email },
      {
        $set: { name: u.name, role: u.role, isActive: true, emailVerified: now, updatedAt: now },
        $setOnInsert: { email: u.email, createdAt: now },
      },
      { upsert: true, returnDocument: "after" }
    );
    recordLog({
      action: existing ? "UPDATE" : "CREATE",
      resource: "user",
      resourceId: res._id.toString(),
      message: `${existing ? "Cập nhật" : "Tạo"} người dùng ${u.name} (${u.email}) với quyền ${u.role}`,
      changes: { email: u.email, role: u.role },
    });
  }

  console.log("Seeding categories...");
  const categoryIdBySlug = new Map();
  for (const c of CATEGORIES) {
    const now = new Date();
    const existing = await categories.findOne({ slug: c.slug });
    const res = await categories.findOneAndUpdate(
      { slug: c.slug },
      {
        $set: {
          name: c.name,
          description: c.description,
          icon: c.icon,
          order: c.order,
          seo: { metaTitle: "", metaDescription: "", keywords: [] },
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: "after" }
    );
    categoryIdBySlug.set(c.slug, res._id);
    recordLog({
      action: existing ? "UPDATE" : "CREATE",
      resource: "category",
      resourceId: res._id.toString(),
      message: `${existing ? "Cập nhật" : "Tạo"} danh mục ${c.icon} ${c.name}`,
      changes: { name: c.name, slug: c.slug, order: c.order },
    });
  }

  console.log("Seeding wallpapers...");
  let published = 0;
  for (const w of WALLPAPERS) {
    const categoryId = categoryIdBySlug.get(w.categorySlug);
    const category = CATEGORIES.find((c) => c.slug === w.categorySlug);
    const slug = w.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const now = new Date();

    // Lượt xem/thích/tải ngẫu nhiên để dashboard và card có số liệu để hiển thị
    const views = 200 + Math.floor(Math.random() * 9000);
    const likes = Math.floor(views * (0.03 + Math.random() * 0.12));
    const downloads = Math.floor(views * (0.05 + Math.random() * 0.2));

    const existing = await wallpapers.findOne({ slug });
    const res = await wallpapers.findOneAndUpdate(
      { slug },
      {
        $set: {
          title: w.title,
          description: w.description,
          category: categoryId,
          categoryName: category.name,
          categorySlug: category.slug,
          deviceType: w.deviceType,
          mediaType: w.mediaType,
          media: w.media,
          thumbnail: w.thumbnail ?? null,
          resolutionLabel: w.resolutionLabel,
          tags: w.tags,
          source: w.source ?? "",
          status: "published",
          publishedAt: now,
          seo: { metaTitle: "", metaDescription: "", keywords: [], canonical: "", noindex: false },
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
        $max: { views, likes, downloads },
      },
      { upsert: true, returnDocument: "after" }
    );
    published += 1;

    recordLog({
      action: existing ? "UPDATE" : "CREATE",
      resource: "wallpaper",
      resourceId: res._id.toString(),
      message: `${existing ? "Cập nhật" : "Tải lên"} hình nền "${w.title}" vào danh mục ${category.name}`,
      changes: { title: w.title, categorySlug: w.categorySlug, deviceType: w.deviceType },
    });
    recordLog({
      action: "PUBLISH",
      resource: "wallpaper",
      resourceId: res._id.toString(),
      message: `Duyệt và đăng "${w.title}" (${w.resolutionLabel})`,
      changes: { status: "published" },
    });
  }

  console.log("Seeding audit logs...");
  pendingLogs.sort((a, b) => a.createdAt - b.createdAt);
  await auditLogs.insertMany(pendingLogs);

  console.log(
    `\nXong: ${DEMO_USERS.length} người dùng, ${CATEGORIES.length} danh mục, ${published} hình nền, ${pendingLogs.length} audit log.`
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

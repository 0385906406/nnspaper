/**
 * Danh mục nhân vật (linh vật) người dùng có thể chọn — dùng chung server/client.
 *
 * Mỗi nhân vật là hai sprite sheet 3×3 trong public/mascots (gói page-mascot):
 * `<slug>-directions.webp` (9 hướng nhìn) và `<slug>-reactions.webp` (9 biểu cảm).
 * Ảnh lấy từ bộ nhân vật vẽ sẵn của page-mascot (MIT), đã thu nhỏ còn 432px.
 */

export type MascotGroup = "animal" | "people" | "robot" | "style";

export type MascotOption = { slug: string; name: string; group: MascotGroup };

export const MASCOT_GROUPS: { key: MascotGroup; label: string }[] = [
  { key: "animal", label: "Động vật" },
  { key: "people", label: "Con người" },
  { key: "robot", label: "Robot & đồ vật" },
  { key: "style", label: "Cáo nhiều phong cách" },
];

export const MASCOTS: MascotOption[] = [
  { slug: "fox", name: "Cáo", group: "animal" },
  { slug: "bear", name: "Gấu", group: "animal" },
  { slug: "bunny", name: "Thỏ", group: "animal" },
  { slug: "cat", name: "Mèo", group: "animal" },
  { slug: "deer", name: "Hươu", group: "animal" },
  { slug: "dino", name: "Khủng long", group: "animal" },
  { slug: "frog", name: "Ếch", group: "animal" },
  { slug: "hamster", name: "Chuột hamster", group: "animal" },
  { slug: "hedgehog", name: "Nhím", group: "animal" },
  { slug: "koala", name: "Gấu koala", group: "animal" },
  { slug: "mouse", name: "Chuột", group: "animal" },
  { slug: "otter", name: "Rái cá", group: "animal" },
  { slug: "owl", name: "Cú mèo", group: "animal" },
  { slug: "panda", name: "Gấu trúc", group: "animal" },
  { slug: "penguin", name: "Chim cánh cụt", group: "animal" },
  { slug: "pug", name: "Chó pug", group: "animal" },
  { slug: "raccoon", name: "Gấu mèo", group: "animal" },
  { slug: "redpanda", name: "Gấu trúc đỏ", group: "animal" },
  { slug: "sheep", name: "Cừu", group: "animal" },
  { slug: "sloth", name: "Con lười", group: "animal" },
  { slug: "tiger", name: "Hổ", group: "animal" },

  { slug: "afro", name: "Tóc xù", group: "people" },
  { slug: "astronaut", name: "Phi hành gia", group: "people" },
  { slug: "bald", name: "Đầu trọc", group: "people" },
  { slug: "ballerina", name: "Diễn viên ballet", group: "people" },
  { slug: "beard", name: "Râu quai nón", group: "people" },
  { slug: "builder", name: "Thợ xây", group: "people" },
  { slug: "cap", name: "Mũ lưỡi trai", group: "people" },
  { slug: "chef", name: "Đầu bếp", group: "people" },
  { slug: "glasses", name: "Đeo kính", group: "people" },
  { slug: "grandpa", name: "Ông", group: "people" },
  { slug: "granny", name: "Bà", group: "people" },
  { slug: "hijabi", name: "Khăn hijab", group: "people" },
  { slug: "nurse", name: "Y tá", group: "people" },
  { slug: "pirate", name: "Cướp biển", group: "people" },
  { slug: "scientist", name: "Nhà khoa học", group: "people" },
  { slug: "sikh", name: "Khăn turban", group: "people" },
  { slug: "skater", name: "Trượt ván", group: "people" },
  { slug: "wizard", name: "Phù thuỷ", group: "people" },

  { slug: "clockwork", name: "Robot lên dây", group: "robot" },
  { slug: "crt", name: "Màn hình CRT", group: "robot" },
  { slug: "cube", name: "Khối lập phương", group: "robot" },
  { slug: "drone", name: "Drone", group: "robot" },
  { slug: "gearbot", name: "Robot bánh răng", group: "robot" },
  { slug: "knight", name: "Hiệp sĩ", group: "robot" },
  { slug: "lantern", name: "Đèn lồng", group: "robot" },
  { slug: "postbot", name: "Robot đưa thư", group: "robot" },
  { slug: "radio", name: "Radio", group: "robot" },
  { slug: "rocket", name: "Tên lửa", group: "robot" },
  { slug: "scout", name: "Robot trinh sát", group: "robot" },
  { slug: "toaster", name: "Máy nướng bánh", group: "robot" },
  { slug: "tv", name: "Tivi", group: "robot" },

  { slug: "fox-ink", name: "Cáo nét mực", group: "style" },
  { slug: "fox-sketch", name: "Cáo bút chì", group: "style" },
  { slug: "fox-riso", name: "Cáo in riso", group: "style" },
  { slug: "fox-paper", name: "Cáo giấy cắt", group: "style" },
  { slug: "fox-pixel", name: "Cáo pixel", group: "style" },
];

/** Nhân vật cho khách và cho tài khoản chưa chọn. */
export const DEFAULT_MASCOT = "fox";
/** Giá trị lưu khi người dùng muốn ẩn nhân vật. */
export const NO_MASCOT = "none";

const SLUGS = new Set(MASCOTS.map((m) => m.slug));

export function isMascotChoice(value: unknown): value is string {
  return typeof value === "string" && (value === NO_MASCOT || SLUGS.has(value));
}

export function mascotSheets(slug: string) {
  return {
    directions: `/mascots/${slug}-directions.webp`,
    reactions: `/mascots/${slug}-reactions.webp`,
  };
}

/**
 * Nhân vật dùng làm ảnh đại diện. Avatar luôn là một nhân vật (người dùng không
 * tải ảnh riêng được), nên chọn "ẩn nhân vật" hay giá trị lạ thì dùng nhân vật mặc định.
 */
export function avatarMascot(value: unknown): string {
  return isMascotChoice(value) && value !== NO_MASCOT ? value : DEFAULT_MASCOT;
}

export function mascotName(slug: string): string {
  return MASCOTS.find((m) => m.slug === slug)?.name ?? "Nhân vật";
}

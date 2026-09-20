/**
 * Chuẩn hoá chữ cho tìm kiếm — dùng chung server và trình duyệt.
 *
 * "Phong Cảnh Đẹp!" -> "phong canh dep". Nhờ vậy gõ không dấu, gõ hoa/thường hay
 * gõ dở chừng ("furi") đều khớp. scripts/seed-search.mjs có bản sao của hàm này,
 * sửa ở đây thì sửa cả ở đó.
 */
export function normalizeSearch(value: string): string {
  return foldChars(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Bỏ dấu + viết thường, giữ nguyên độ dài (mỗi ký tự gốc ứng với đúng một ký tự). */
function foldChars(value: string): string {
  let out = "";
  for (const ch of value.toLowerCase()) {
    if (ch === "đ") {
      out += "d";
      continue;
    }
    const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
    // Ký tự lạ tách ra nhiều hơn một ký tự thì thay bằng khoảng trắng để giữ độ dài
    out += base.length === 1 ? base : " ";
  }
  return out;
}

/** Tách từ khoá thành các từ, bỏ trùng. */
export function searchTokens(query: string): string[] {
  return [...new Set(normalizeSearch(query).split(" ").filter(Boolean))];
}

/** Chuỗi tìm kiếm lưu kèm hình nền: tiêu đề + tag + danh mục + mô tả. */
export function buildSearchText(input: {
  title?: string | null;
  tags?: string[] | null;
  categoryName?: string | null;
  description?: string | null;
}): string {
  return normalizeSearch(
    [input.title, ...(input.tags ?? []), input.categoryName, input.description].filter(Boolean).join(" ")
  );
}

/**
 * Regex khớp một từ khoá ở đầu một từ trong chuỗi đã chuẩn hoá: "anh" khớp "anh sang"
 * nhưng không khớp "thanh", còn gõ dở "furi" vẫn khớp "furina".
 */
export function wordPrefixPattern(token: string): string {
  return `(?:^| )${escapeRegex(token)}`;
}

/** `text` (đã chuẩn hoá) có chứa mọi từ khoá ở đầu từ không. */
export function matchesAllTokens(text: string, tokens: string[]): boolean {
  const padded = ` ${text}`;
  return tokens.every((t) => padded.includes(` ${t}`));
}

/** Thoát ký tự đặc biệt trước khi đưa vào RegExp. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Các đoạn [start, end) trong `text` khớp với từ khoá ở đầu từ (không phân biệt
 * dấu) — cùng quy tắc với bộ lọc tìm kiếm — dùng để tô đậm phần khớp trong ô gợi ý.
 */
export function matchRanges(text: string, query: string): [number, number][] {
  const tokens = searchTokens(query);
  if (!tokens.length) return [];

  // Chuẩn hoá từng ký tự để vị trí trong chuỗi chuẩn hoá trùng với chuỗi gốc
  const chars = Array.from(text);
  const folded = foldChars(text);
  const ranges: [number, number][] = [];
  for (const token of tokens) {
    let from = 0;
    for (;;) {
      const at = folded.indexOf(token, from);
      if (at < 0) break;
      // Chỉ tô khi khớp ở đầu từ, "ga" không tô giữa chữ "ngày"
      if (at === 0 || !/[a-z0-9]/.test(folded[at - 1])) ranges.push([at, at + token.length]);
      from = at + token.length;
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);

  // Gộp các đoạn chồng nhau; giới hạn theo số ký tự thật của chuỗi gốc
  const merged: [number, number][] = [];
  for (const [s, e] of ranges) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, Math.min(e, chars.length)]);
  }
  return merged;
}

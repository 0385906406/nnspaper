import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Bảo vệ tối thiểu cho các endpoint ghi dữ liệu và upload.
 * Client gửi header `x-admin-token`, server so sánh với ADMIN_TOKEN.
 *
 * Đây là mức đủ cho giai đoạn đầu. Khi có nhiều người dùng thật, hãy thay
 * bằng NextAuth/Auth.js hoặc Clerk thay vì mở rộng cơ chế token tĩnh này.
 */
export function isAuthorized(request: Request): boolean {
  const expected = process.env.ADMIN_TOKEN;

  // Không cấu hình token = khoá toàn bộ ghi dữ liệu, an toàn hơn là mở
  if (!expected) return false;

  const provided = request.headers.get("x-admin-token") ?? "";

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;

  // So sánh theo thời gian hằng định để không rò rỉ token qua timing attack
  return timingSafeEqual(a, b);
}

export function unauthorized(): Response {
  return Response.json(
    { error: "Không có quyền. Thiếu hoặc sai header x-admin-token." },
    { status: 401 }
  );
}

import "server-only";
import { connectDB } from "@/lib/mongodb";

declare global {
  var _dbUnavailable: boolean | undefined;
}

/**
 * Chạy `query` qua MongoDB; nếu chưa kết nối được (dev local chưa cài DB) thì
 * chuyển sang `fallback` (dữ liệu ảo) để vẫn xem được giao diện. Nhớ lại trạng thái lỗi trên
 * `globalThis` (thay vì biến module-level) để các lần gọi sau — kể cả từ Route Handler lẫn
 * Page, hai phía Next.js dev có thể khởi tạo module này riêng biệt — không phải chờ lại
 * serverSelectionTimeoutMS (10s) mỗi lần.
 */
export async function withDb<T>(query: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
  if (globalThis._dbUnavailable) return fallback();

  try {
    await connectDB();
    return await query();
  } catch (error) {
    globalThis._dbUnavailable = true;
    console.warn(
      "[data-source] Không kết nối được MongoDB, tạm dùng dữ liệu ảo:",
      error instanceof Error ? error.message : error
    );
    return fallback();
  }
}

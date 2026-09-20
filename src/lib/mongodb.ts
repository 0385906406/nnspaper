import "server-only";
import mongoose from "mongoose";

/**
 * Kết nối MongoDB dùng chung cho toàn app.
 *
 * Ở chế độ dev, Next.js hot-reload module liên tục. Nếu mỗi lần reload lại mở
 * một kết nối mới thì MongoDB sẽ nhanh chóng hết connection slot. Vì vậy ta
 * cache instance kết nối trên `globalThis` — thứ duy nhất sống sót qua hot-reload.
 */

declare global {
  var _mongoose:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const cached = globalThis._mongoose ?? { conn: null, promise: null };
globalThis._mongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "Thiếu biến môi trường MONGODB_URI. Hãy sao chép .env.example thành .env.local và điền chuỗi kết nối."
    );
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB || undefined,
      // Tắt buffering: nếu mất kết nối thì báo lỗi ngay thay vì treo request
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // Xoá promise hỏng để lần gọi sau thử kết nối lại từ đầu
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

/** Kiểm tra kết nối cho endpoint health-check. */
export async function isDbHealthy(): Promise<boolean> {
  try {
    const conn = await connectDB();
    await conn.connection.db?.admin().ping();
    return true;
  } catch {
    return false;
  }
}

import { NextResponse } from "next/server";
import { listMascots } from "@/lib/custom-mascots";

export const runtime = "nodejs";

/**
 * Danh sách nhân vật cho trang chọn ở client (bộ gốc + nhân vật admin tự thêm).
 *
 * Công khai và chỉ đọc: đây đúng là thứ mọi khách đều thấy trong trang cá nhân.
 */
export async function GET() {
  const mascots = await listMascots();
  return NextResponse.json(
    { mascots },
    // Danh sách rất ít thay đổi; cache ngắn để admin thêm xong thấy gần như ngay
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
  );
}

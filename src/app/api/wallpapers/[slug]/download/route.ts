import { incrementDownloads } from "@/lib/wallpapers";

/** POST /api/wallpapers/[slug]/download — tăng bộ đếm lượt tải và trả về URL gốc để client tải file. */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/wallpapers/[slug]/download">
) {
  const { slug } = await params;
  const url = await incrementDownloads(slug);
  if (!url) return Response.json({ error: "Không tìm thấy hình nền" }, { status: 404 });

  return Response.json({ url });
}

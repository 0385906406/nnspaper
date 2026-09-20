import { isDbHealthy } from "@/lib/mongodb";

// Luôn chạy động: health-check mà bị cache thì vô nghĩa
export const dynamic = "force-dynamic";

/** GET /api/health — dùng cho Docker healthcheck và giám sát uptime. */
export async function GET() {
  const db = await isDbHealthy();
  const cloudinary = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

  return Response.json(
    {
      status: db ? "ok" : "degraded",
      services: { database: db ? "up" : "down", cloudinary: cloudinary ? "configured" : "missing" },
      timestamp: new Date().toISOString(),
    },
    { status: db ? 200 : 503 }
  );
}

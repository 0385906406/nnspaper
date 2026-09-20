import { auth } from "@/auth";
import { hasPermission } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import { AuditLog } from "@/models/AuditLog";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const RESOURCES = ["user", "category", "wallpaper", "setting", "role"];

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Chỉ admin mới xem được audit logs
    if (!(await hasPermission("setting.view"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get("page") || "1") || 1);
    const limit = Math.min(200, Math.max(1, parseInt(sp.get("limit") || "20") || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    const resource = sp.get("resource");
    if (resource && RESOURCES.includes(resource)) query.resource = resource;

    const action = sp.get("action")?.trim();
    if (action) query.action = action.toUpperCase();

    const status = sp.get("status");
    if (status === "success" || status === "failed") query.status = status;

    // Lọc theo khoảng ngày: "from" tính từ 00:00, "to" tính đến hết 23:59 hôm đó
    const from = sp.get("from");
    const to = sp.get("to");
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from && !Number.isNaN(Date.parse(from))) range.$gte = new Date(from);
      if (to && !Number.isNaN(Date.parse(to))) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        range.$lte = end;
      }
      if (Object.keys(range).length) query.createdAt = range;
    }

    const q = sp.get("q")?.trim();
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { message: { $regex: safe, $options: "i" } },
        { userName: { $regex: safe, $options: "i" } },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(query),
    ]);

    return NextResponse.json({
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET audit logs error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

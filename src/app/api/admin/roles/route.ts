import { auth } from "@/auth";
import { hasPermission, logAudit } from "@/lib/admin";
import { Role } from "@/models/Role";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasPermission("role.view"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const roles = await Role.find();
    return NextResponse.json(roles);
  } catch (error) {
    console.error("GET roles error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasPermission("role.create"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, slug, description, permissions } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug required" }, { status: 400 });
    }

    const role = await Role.create({ name, slug, description, permissions, isSystem: false });

    await logAudit(session.user.id, "CREATE", "role", role._id.toString(), {}, `Created role: ${name}`);

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error("POST role error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

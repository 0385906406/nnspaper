import "server-only";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/admin";

/** Kiểm tra đăng nhập + quyền cho Route Handler quản trị; trả về `error` là response cần trả ngay. */
export async function guard(
  permission: string
): Promise<{ session: Session; error?: undefined } | { error: NextResponse; session?: undefined }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!(await hasPermission(permission))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

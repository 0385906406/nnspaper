import "server-only";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { User, type UserDoc } from "@/models/User";
import { Role } from "@/models/Role";
import { Permission, DEFAULT_ROLES } from "@/models/Permission";
import { SystemSettings } from "@/models/SystemSettings";
import { AuditLog } from "@/models/AuditLog";

/**
 * Lấy user hiện tại từ DB (không tin role trong JWT — role có thể đã bị đổi
 * hoặc tài khoản bị khoá sau khi token được cấp).
 */
export async function getCurrentUser(): Promise<UserDoc | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  await connectDB();
  const user = await User.findById(id);
  if (!user || !user.isActive) return null;
  return user;
}

/** Danh sách permission của một role slug. */
export async function getRolePermissions(slug?: string): Promise<string[]> {
  if (!slug) return [];
  await connectDB();
  const role = await Role.findOne({ slug });
  if (role) return role.permissions ?? [];
  // DB chưa seed roles — dùng định nghĩa mặc định để app vẫn chạy đúng
  return DEFAULT_ROLES.find((r) => r.slug === slug)?.permissions ?? [];
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin";
}

/** Admin có toàn quyền; các role khác tra theo permission list. */
export async function hasPermission(permissionKey: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  if (user.role === "admin") return true;

  const permissions = await getRolePermissions(user.role);
  return permissions.includes(permissionKey);
}

export async function canAccess(resource: string, action: string): Promise<boolean> {
  return hasPermission(`${resource}.${action}`);
}

export async function logAudit(
  userId: string,
  action: string,
  resource: string,
  resourceId?: string,
  changes?: Record<string, unknown>,
  message: string = ""
) {
  try {
    await connectDB();
    const actor = await User.findById(userId).select("name email");
    await AuditLog.create({
      userId,
      userName: actor?.name || actor?.email || "",
      action,
      resource,
      resourceId,
      changes,
      message,
      status: "success",
    });
  } catch (error) {
    console.error("Audit log failed:", error);
  }
}

export async function getSetting(key: string, defaultValue: unknown = null) {
  await connectDB();
  const setting = await SystemSettings.findOne({ key });
  return setting?.value ?? defaultValue;
}

export async function updateSetting(key: string, value: unknown, userId?: string) {
  await connectDB();
  return SystemSettings.findOneAndUpdate(
    { key },
    { value, updatedBy: userId },
    { new: true, upsert: true }
  );
}

export async function getSettings(category?: string) {
  await connectDB();
  return SystemSettings.find(category ? { category } : {});
}

export async function seedRolesAndPermissions() {
  await connectDB();
  const { DEFAULT_PERMISSIONS } = await import("@/models/Permission");

  for (const perm of DEFAULT_PERMISSIONS) {
    await Permission.findOneAndUpdate({ key: perm.key }, perm, { upsert: true });
  }

  for (const role of DEFAULT_ROLES) {
    await Role.findOneAndUpdate({ slug: role.slug }, role, { upsert: true });
  }
}

export async function seedSettings() {
  await connectDB();
  const { SETTING_DEFS } = await import("@/lib/settings");

  for (const { key, value, type, category, description, help } of SETTING_DEFS) {
    await SystemSettings.findOneAndUpdate(
      { key },
      {
        // Nhãn và kiểu luôn đồng bộ theo code, riêng `value` chỉ đặt lúc tạo mới
        // để lần seed sau không ghi đè giá trị admin đã chỉnh.
        $set: { type, category, description, help },
        $setOnInsert: { value },
      },
      { upsert: true }
    );
  }

  // Dọn các key đã bỏ khỏi code (smtp_host, max_upload_size...) để trang Cài đặt
  // không còn hiện những mục không điều khiển gì
  await SystemSettings.deleteMany({ key: { $nin: SETTING_DEFS.map((d) => d.key) } });
}

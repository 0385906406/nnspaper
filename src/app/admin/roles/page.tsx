"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  Badge,
} from "@/components/admin/ui";

interface Role {
  _id: string;
  name: string;
  slug: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
}

// Các nhóm quyền hiển thị thành cột, theo đúng thứ tự này
const RESOURCES = [
  { key: "user", label: "Người dùng" },
  { key: "category", label: "Danh mục" },
  { key: "wallpaper", label: "Hình nền" },
  { key: "comment", label: "Bình luận" },
  { key: "setting", label: "Cài đặt" },
  { key: "role", label: "Vai trò" },
];

const ACTIONS = [
  { key: "view", label: "Xem" },
  { key: "create", label: "Tạo" },
  { key: "edit", label: "Sửa" },
  { key: "delete", label: "Xoá" },
  { key: "approve", label: "Duyệt" },
];

// Tổng số quyền có thể cấp — tính từ ma trận thay vì gõ cứng để thêm quyền mới không bị lệch
const TOTAL_PERMISSIONS: Record<string, string[]> = {
  user: ["view", "create", "edit", "delete"],
  category: ["view", "create", "edit", "delete"],
  wallpaper: ["view", "create", "edit", "delete", "approve"],
  comment: ["view", "edit", "delete"],
  setting: ["view", "edit"],
  role: ["view", "create", "edit", "delete"],
};
const PERMISSION_COUNT = Object.values(TOTAL_PERMISSIONS).reduce((n, a) => n + a.length, 0);

const ROLE_TONES: Record<string, "accent" | "success" | "neutral"> = {
  admin: "accent",
  editor: "success",
  viewer: "neutral",
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/roles")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 403 ? "Bạn không có quyền xem vai trò." : "Không tải được vai trò."
          );
        }
        return res.json();
      })
      .then(setRoles)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const colCount = 2 + RESOURCES.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">👤 Vai trò</h1>
        <p className="mt-1 text-muted">Quyền hạn của từng vai trò trong hệ thống</p>
      </div>

      {error && (
        <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      {/* Ma trận quyền: mỗi dòng một vai trò, mỗi cột một nhóm chức năng */}
      <Table minWidth="64rem">
        <TableHeader>
          <TableRow isHeader>
            <TableCell isHeader>Vai trò</TableCell>
            {RESOURCES.map((r) => (
              <TableCell key={r.key} isHeader align="center">
                {r.label}
              </TableCell>
            ))}
            <TableCell isHeader align="center" nowrap>
              Tổng quyền
            </TableCell>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading && <TableEmpty colSpan={colCount}>Đang tải...</TableEmpty>}

          {!loading && !error && roles.length === 0 && (
            <TableEmpty colSpan={colCount}>
              Chưa có vai trò nào. Chạy <code>scripts/seed-admin.mjs</code> để khởi tạo.
            </TableEmpty>
          )}

          {!loading &&
            roles.map((role) => {
              const owned = new Set(role.permissions);
              return (
                <TableRow key={role._id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge tone={ROLE_TONES[role.slug] ?? "neutral"}>{role.name}</Badge>
                      {role.isSystem && (
                        <span className="text-xs text-muted" title="Vai trò hệ thống">
                          🔒
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 max-w-xs text-xs text-muted">{role.description}</p>
                  </TableCell>

                  {RESOURCES.map((resource) => {
                    const granted = ACTIONS.filter((a) => owned.has(`${resource.key}.${a.key}`));
                    return (
                      <TableCell key={resource.key} align="center">
                        {granted.length === 0 ? (
                          <span className="text-muted/50" title="Không có quyền">
                            —
                          </span>
                        ) : (
                          <div className="flex flex-wrap justify-center gap-1">
                            {granted.map((a) => (
                              <span
                                key={a.key}
                                className="rounded bg-accent/10 px-1.5 py-0.5 text-[11px] font-medium text-accent"
                              >
                                {a.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    );
                  })}

                  <TableCell align="center" nowrap>
                    <span className="font-semibold text-foreground">{role.permissions.length}</span>
                    <span className="text-muted"> / {PERMISSION_COUNT}</span>
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>

      <p className="text-xs text-muted">
        🔒 Vai trò hệ thống không xoá được. Quyền được cấp theo từng nhóm chức năng — ô “—” nghĩa là
        vai trò đó không truy cập được nhóm này.
      </p>
    </div>
  );
}

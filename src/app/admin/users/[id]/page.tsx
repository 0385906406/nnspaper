"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Button,
  Input,
  Form,
  FormGroup,
  FormActions,
  Card,
  Select,
} from "@/components/admin/ui";
import { PageHeader } from "@/components/admin/page-header";

interface User {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  isActive: boolean;
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<User | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(`/api/admin/users/${userId}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setFormData(data);
      } catch (error) {
        alert("Không thể tải người dùng");
        router.push("/admin/users");
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData) return;

    setErrors({});
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save");
      }

      alert("Cập nhật thành công");
      router.push("/admin/users");
    } catch (error) {
      alert(String(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Chỉnh sửa người dùng" />
        <Card>
          <p className="text-muted">Đang tải...</p>
        </Card>
      </div>
    );
  }

  if (!formData) {
    return (
      <div>
        <PageHeader title="Chỉnh sửa người dùng" />
        <Card>
          <p className="text-danger">Không tìm thấy người dùng</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Chỉnh sửa người dùng" description={`ID: ${userId.slice(0, 8)}...`} />

      <Card>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Input
              label="Tên"
              placeholder="Nhập tên"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              error={errors.name}
              required
            />

            <Input
              label="Email"
              type="email"
              placeholder="user@example.com"
              value={formData.email || ""}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              error={errors.email}
            />

            <Input
              label="Số điện thoại"
              placeholder="+84..."
              value={formData.phone || ""}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />

            <Select
              label="Vai trò"
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              options={[
                { label: "Người xem", value: "viewer" },
                { label: "Biên tập viên", value: "editor" },
                { label: "Quản trị viên", value: "admin" },
              ]}
            />

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="rounded"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-foreground">
                Người dùng đang hoạt động
              </label>
            </div>
          </FormGroup>

          <FormActions>
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" isLoading={saving}>
              Lưu thay đổi
            </Button>
          </FormActions>
        </Form>
      </Card>

      {/* Danger zone */}
      <Card className="border-danger/30 bg-danger/5">
        <div>
          <h3 className="font-bold text-danger">⚠️ Khu vực nguy hiểm</h3>
          <p className="mt-2 text-sm text-muted">
            Xóa người dùng này khỏi hệ thống. Hành động này không thể hoàn tác.
          </p>
          <Button
            variant="danger"
            size="sm"
            className="mt-4"
            onClick={() => {
              if (confirm("Bạn chắc chắn muốn xóa người dùng này?")) {
                // Delete logic
                alert("Feature sẽ được thêm sau");
              }
            }}
          >
            Xóa người dùng
          </Button>
        </div>
      </Card>
    </div>
  );
}

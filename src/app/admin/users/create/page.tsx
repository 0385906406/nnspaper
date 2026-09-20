"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Form, FormGroup, FormActions, Card, Select } from "@/components/admin/ui";

export default function CreateUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "viewer",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create");
      }

      alert("Tạo người dùng thành công");
      router.push("/admin/users");
    } catch (error) {
      alert(String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Tạo người dùng mới</h1>
        <p className="mt-1 text-muted">Thêm tài khoản người dùng mới vào hệ thống</p>
      </div>

      <Card>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Input
              label="Tên"
              placeholder="Nhập tên người dùng"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="user@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
              required
            />
            <Select
              label="Vai trò"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              options={[
                { label: "Người xem", value: "viewer" },
                { label: "Biên tập viên", value: "editor" },
                { label: "Quản trị viên", value: "admin" },
              ]}
            />
          </FormGroup>

          <FormActions>
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" isLoading={loading}>
              Tạo người dùng
            </Button>
          </FormActions>
        </Form>
      </Card>
    </div>
  );
}

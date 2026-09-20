"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "@/lib/toast";

export function SignupForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "❌ Đăng ký thất bại");
        return;
      }

      toast.success("✅ " + data.message);
      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
    } catch (err) {
      toast.error("❌ Lỗi: " + String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="name" className="block text-xs font-medium text-foreground mb-2">
          Tên
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Nhập tên của bạn"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
          disabled={loading}
          required
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-xs font-medium text-foreground mb-2">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="user@example.com"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
          disabled={loading}
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-xs font-medium text-foreground mb-2">
          Mật khẩu
        </label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Ít nhất 8 ký tự"
          minLength={8}
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
          disabled={loading}
          required
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-xs font-medium text-foreground mb-2">
          Xác nhận mật khẩu
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          placeholder="Nhập lại mật khẩu"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
          disabled={loading}
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="pastel-ring pastel-ring-hover w-full rounded-lg border border-border bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Đang đăng ký..." : "Đăng ký"}
      </button>

      <p className="text-center text-xs text-muted">
        Bằng đăng ký, bạn đồng ý với{" "}
        <Link href="/dieu-khoan-su-dung" className="text-accent hover:underline">
          Điều khoản sử dụng
        </Link>
      </p>
    </form>
  );
}

"use client";

import { signIn, getSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

const ERROR_MESSAGES: Record<string, string> = {
  missing_credentials: "Vui lòng nhập đầy đủ email và mật khẩu.",
  invalid_credentials: "Email hoặc mật khẩu không đúng.",
  account_disabled: "Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên.",
  email_not_verified: "Tài khoản chưa xác thực email. Hãy kiểm tra hộp thư của bạn.",
};

const PANEL_ROLES = new Set(["admin", "editor"]);

interface EmailLoginFormProps {
  next?: string;
}

export function EmailLoginForm({ next = "/" }: EmailLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", { email, password, redirect: false });

      if (!result || result.error) {
        const message = ERROR_MESSAGES[result?.code ?? ""] ?? "Email hoặc mật khẩu không đúng.";
        setError(message);
        toast.error(message);
        return;
      }

      const session = await getSession();
      const role = session?.user?.role;

      // Người dùng bấm vào link cần đăng nhập thì trả họ về đúng chỗ đó; còn
      // lại thì admin/editor vào thẳng trang quản trị.
      // Người không có quyền quản trị mà next là /admin (vd. từ link xác thực cũ)
      // thì về trang chủ, không đẩy vào trang sẽ bị chặn.
      const canAdmin = PANEL_ROLES.has(role ?? "");
      const wantsAdmin = next === "/admin" || next.startsWith("/admin/");
      const target = wantsAdmin && !canAdmin ? "/" : next !== "/" ? next : canAdmin ? "/admin" : "/";

      toast.success("Đăng nhập thành công!");
      router.replace(target);
      router.refresh();
    } catch {
      const message = "Không kết nối được máy chủ. Vui lòng thử lại.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="email" className="block text-xs font-medium text-foreground mb-2">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          autoComplete="email"
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
          disabled={loading}
          required
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="pastel-ring pastel-ring-hover w-full rounded-lg border border-border bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </form>
  );
}

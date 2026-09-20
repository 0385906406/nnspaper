"use server";

import { signIn } from "@/auth";

// Chỉ nhận đường dẫn nội bộ; "//evil.com" cũng bắt đầu bằng "/" nên phải loại riêng
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function loginWithGoogle(formData: FormData) {
  await signIn("google", { redirectTo: safeNext(formData.get("next")) });
}

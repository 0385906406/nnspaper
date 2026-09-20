import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/breadcrumbs";

type Props = {
  icon?: string;
  title: string;
  description?: string;
  children: ReactNode;
};

/**
 * Khung dùng chung cho các trang nội dung tĩnh (giới thiệu, liên hệ, chính sách...).
 * Cùng cấu trúc header (icon + h1 + mô tả) và card bo góc như trang chủ/trang danh sách
 * và panel thông tin ở trang chi tiết hình nền, để toàn site đồng bộ một kiểu giao diện.
 */
export function StaticPage({ icon, title, description, children }: Props) {
  return (
    <AppShell>
      <Breadcrumbs items={[{ label: "Trang chủ", href: "/" }, { label: title }]} />

      <div className="animate-fade-in-up mb-5">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          {icon ? `${icon} ` : ""}
          {title}
        </h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>

      <div
        className="animate-fade-in-up max-w-2xl overflow-hidden rounded-xl border border-border bg-surface"
        style={{ animationDelay: "80ms" }}
      >
        <div className="pastel-flow h-1 w-full" aria-hidden="true" />
        <div className="space-y-4 p-5 text-sm leading-relaxed text-muted sm:p-6 [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2:first-child]:mt-0 [&_strong]:text-foreground">
          {children}
        </div>
      </div>
    </AppShell>
  );
}

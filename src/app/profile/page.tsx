import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { MascotSettings } from "@/components/mascot-picker";
import { getUserMascot } from "@/lib/mascot-preference";
import { MascotAvatar } from "@/components/mascot-avatar";
import { avatarMascot, mascotName } from "@/lib/mascots";

const ROLE_LABELS: Record<string, string> = {
  admin: "Quản trị viên",
  editor: "Biên tập viên",
  viewer: "Người dùng",
};

export const metadata: Metadata = {
  title: "Thông tin cá nhân",
  // Trang cá nhân chỉ có nghĩa với chủ tài khoản — không cho Google lập chỉ mục.
  robots: { index: false, follow: false },
};

const CARD = "rounded-2xl border border-border bg-surface p-6";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/dang-nhap?next=%2Fprofile");
  }

  const mascot = await getUserMascot(session.user.id);
  const { name, email, phone, role } = session.user;
  const avatar = avatarMascot(mascot);
  const displayName = name || email?.split("@")[0] || "Bạn";

  const rows: [string, string][] = [
    ["Tên", name || "Chưa cập nhật"],
    ["Email", email || "Chưa cập nhật"],
  ];
  if (phone) rows.push(["Số điện thoại", phone]);
  if (role) rows.push(["Vai trò", ROLE_LABELS[role] ?? "Người dùng"]);

  return (
    <AppShell>
      <div className="animate-fade-in-up mx-auto max-w-6xl">
        <h1 className="mb-6 text-2xl font-bold text-foreground sm:text-3xl">Thông tin cá nhân</h1>

        {/*
          Desktop: hai cột — trái là tài khoản + thao tác, phải là chọn nhân vật (phần dài nhất).
          Mobile: xếp dọc theo thứ tự tài khoản → nhân vật → thao tác.
        */}
        {/* Hàng cuối 1fr hứng phần cao dư của cột phải, để hai thẻ bên trái nằm sát nhau */}
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:grid-rows-[auto_auto_1fr]">
          <section className={`${CARD} lg:col-start-1 lg:row-start-1`}>
            <div className="mb-5 flex items-center gap-4">
              {/* Ảnh đại diện luôn là nhân vật đã chọn — không có ảnh tải lên */}
              <MascotAvatar mascot={avatar} className="h-16 w-16" label={`Nhân vật ${mascotName(avatar)}`} />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-foreground">{displayName}</p>
                {role && <p className="text-sm text-muted">{ROLE_LABELS[role] ?? "Người dùng"}</p>}
                <a href="#nhan-vat" className="text-xs font-medium text-accent hover:underline">
                  Đổi ảnh đại diện
                </a>
              </div>
            </div>

            <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">Thông tin tài khoản</h2>
            <dl className="divide-y divide-border/60">
              {rows.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="shrink-0 text-sm text-muted">{label}</dt>
                  <dd className="min-w-0 truncate text-right text-sm font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>

            <button className="mt-5 w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90">
              Chỉnh sửa thông tin
            </button>
          </section>

          <section
            id="nhan-vat"
            className={`${CARD} scroll-mt-20 lg:col-start-2 lg:row-span-3 lg:row-start-1`}
          >
            <h2 className="mb-1 text-lg font-bold text-foreground">Nhân vật của bạn</h2>
            <p className="mb-4 text-sm text-muted">
              Nhân vật là ảnh đại diện của bạn ở bình luận và menu tài khoản, đồng thời đồng hành ở cuối
              thanh bên trái (trên máy tính) và nhìn theo con trỏ chuột.
            </p>
            <MascotSettings value={mascot} />
          </section>

          <section className={`${CARD} lg:col-start-1 lg:row-start-2`}>
            <h2 className="mb-4 text-lg font-bold text-foreground">Thao tác</h2>

            <div className="space-y-3">
              <button className="w-full rounded-lg border border-border bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-2">
                Đổi mật khẩu
              </button>

              <button className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/20">
                Xóa tài khoản
              </button>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

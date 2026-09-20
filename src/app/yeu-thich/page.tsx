import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { WallpaperGrid } from "@/components/wallpaper-grid";
import { auth } from "@/auth";
import { getFavoriteWallpapers } from "@/lib/favorites";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Yêu thích",
  alternates: { canonical: absoluteUrl("/yeu-thich") },
  robots: { index: false, follow: true },
};

export default async function FavoritesPage() {
  const session = await auth();

  return (
    <AppShell>
      <Breadcrumbs items={[{ label: "Trang chủ", href: "/" }, { label: "Yêu thích" }]} />
      <div className="animate-fade-in-up mb-5">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">❤️ Hình nền yêu thích</h1>
        <p className="mt-1 text-sm text-muted">Danh sách hình nền bạn đã lưu để xem lại sau.</p>
      </div>

      {session?.user?.id ? (
        <FavoritesList userId={session.user.id} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface py-16 text-center">
          <p className="text-4xl">🔒</p>
          <p className="text-sm text-muted">Đăng nhập để xem và lưu hình nền yêu thích của bạn.</p>
          <Link
            href={`/dang-nhap?next=${encodeURIComponent("/yeu-thich")}`}
            className="mt-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            Đăng nhập
          </Link>
        </div>
      )}
    </AppShell>
  );
}

async function FavoritesList({ userId }: { userId: string }) {
  const items = await getFavoriteWallpapers(userId);

  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface py-16 text-center">
        <p className="text-4xl">🤍</p>
        <p className="text-sm text-muted">Bạn chưa lưu hình nền nào. Bấm nút &quot;Yêu thích&quot; ở trang chi tiết để lưu.</p>
      </div>
    );
  }

  return <WallpaperGrid items={items} />;
}

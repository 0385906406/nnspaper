import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { WallpaperGrid } from "@/components/wallpaper-grid";
import { Pagination } from "@/components/pagination";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getWallpapers } from "@/lib/wallpapers";
import { siteConfig, absoluteUrl } from "@/lib/site";
import { robotsFor } from "@/lib/settings";

export async function generateMetadata({
  searchParams,
}: PageProps<"/hinh-nen-dien-thoai">): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = typeof sp.page === "string" ? sp.page : undefined;
  const isFiltered = Boolean(q) || Boolean(page && page !== "1");

  const title = "Hình nền điện thoại 4K đẹp nhất";
  const description = `Tổng hợp hình nền điện thoại tỉ lệ dọc, độ phân giải cao (2K, 4K UHD) trên ${siteConfig.name}.`;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl("/hinh-nen-dien-thoai") },
    robots: await robotsFor(isFiltered),
  };
}

export default async function PhoneWallpaperPage({
  searchParams,
}: PageProps<"/hinh-nen-dien-thoai">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = Number(typeof sp.page === "string" ? sp.page : "1") || 1;

  const { items, pageCount } = await getWallpapers({ device: "phone", q, page });
  const basePath = "/hinh-nen-dien-thoai";

  return (
    <AppShell searchQuery={q}>
      <Breadcrumbs items={[{ label: "Trang chủ", href: "/" }, { label: "Hình nền điện thoại" }]} />
      <div className="animate-fade-in-up mb-5">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">📱 Hình nền điện thoại</h1>
        <p className="mt-1 text-sm text-muted">
          Hình nền và video nền tỉ lệ dọc, vừa khít màn hình điện thoại.
        </p>
      </div>

      <WallpaperGrid items={items} />
      <Pagination basePath={basePath} page={page} pageCount={pageCount} searchParams={{ q }} />
    </AppShell>
  );
}

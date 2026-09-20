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
}: PageProps<"/hinh-nen-may-tinh">): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = typeof sp.page === "string" ? sp.page : undefined;
  const isFiltered = Boolean(q) || Boolean(page && page !== "1");

  const title = "Hình nền máy tính 4K đẹp nhất";
  const description = `Tổng hợp hình nền desktop, laptop độ phân giải cao (2K, 4K UHD) trên ${siteConfig.name}.`;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl("/hinh-nen-may-tinh") },
    robots: await robotsFor(isFiltered),
  };
}

export default async function DesktopWallpaperPage({
  searchParams,
}: PageProps<"/hinh-nen-may-tinh">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = Number(typeof sp.page === "string" ? sp.page : "1") || 1;

  const { items, pageCount } = await getWallpapers({ device: "pc", q, page });
  const basePath = "/hinh-nen-may-tinh";

  return (
    <AppShell searchQuery={q}>
      <Breadcrumbs items={[{ label: "Trang chủ", href: "/" }, { label: "Hình nền máy tính" }]} />
      <div className="animate-fade-in-up mb-5">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">💻 Hình nền máy tính</h1>
        <p className="mt-1 text-sm text-muted">
          Hình nền và video nền tỉ lệ ngang, tối ưu cho màn hình desktop và laptop.
        </p>
      </div>

      <WallpaperGrid items={items} />
      <Pagination basePath={basePath} page={page} pageCount={pageCount} searchParams={{ q }} />
    </AppShell>
  );
}

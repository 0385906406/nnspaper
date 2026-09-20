import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { WallpaperGrid } from "@/components/wallpaper-grid";
import { Pagination } from "@/components/pagination";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getTrendingWallpapers, type DeviceFilter } from "@/lib/wallpapers";
import { siteConfig, absoluteUrl } from "@/lib/site";
import { robotsFor } from "@/lib/settings";

function parseDevice(value?: string): DeviceFilter | undefined {
  return value === "pc" || value === "phone" ? value : undefined;
}

export async function generateMetadata({ searchParams }: PageProps<"/thinh-hanh">): Promise<Metadata> {
  const sp = await searchParams;
  const page = typeof sp.page === "string" ? sp.page : undefined;
  const isFiltered = Boolean(page && page !== "1");

  const title = "Thịnh hành - Hình nền được xem và thích nhiều nhất";
  const description = `Những hình nền và video nền được xem, thích nhiều nhất trên ${siteConfig.name}.`;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl("/thinh-hanh") },
    robots: await robotsFor(isFiltered),
  };
}

export default async function TrendingPage({ searchParams }: PageProps<"/thinh-hanh">) {
  const sp = await searchParams;
  const device = parseDevice(typeof sp.device === "string" ? sp.device : undefined);
  const page = Number(typeof sp.page === "string" ? sp.page : "1") || 1;

  const { items, pageCount } = await getTrendingWallpapers({ device, page });
  const basePath = "/thinh-hanh";

  return (
    <AppShell>
      <Breadcrumbs items={[{ label: "Trang chủ", href: "/" }, { label: "Thịnh hành" }]} />
      <div className="animate-fade-in-up mb-5">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">🔥 Thịnh hành</h1>
        <p className="mt-1 text-sm text-muted">
          Hình nền và video nền được cộng đồng xem và thích nhiều nhất.
        </p>
      </div>

      <WallpaperGrid items={items} />
      <Pagination basePath={basePath} page={page} pageCount={pageCount} searchParams={{ device }} />
    </AppShell>
  );
}

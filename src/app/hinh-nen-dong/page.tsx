import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { WallpaperGrid } from "@/components/wallpaper-grid";
import { Pagination } from "@/components/pagination";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getWallpapers, type DeviceFilter } from "@/lib/wallpapers";
import { siteConfig, absoluteUrl } from "@/lib/site";
import { robotsFor } from "@/lib/settings";

function parseDevice(value?: string): DeviceFilter | undefined {
  return value === "pc" || value === "phone" ? value : undefined;
}

export async function generateMetadata({ searchParams }: PageProps<"/hinh-nen-dong">): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = typeof sp.page === "string" ? sp.page : undefined;
  const isFiltered = Boolean(q) || Boolean(page && page !== "1");

  const title = "Hình nền động (Live Wallpaper) 4K";
  const description = `Kho video nền / hình nền động 4K cho điện thoại và máy tính trên ${siteConfig.name}.`;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl("/hinh-nen-dong") },
    robots: await robotsFor(isFiltered),
  };
}

export default async function LiveWallpaperPage({ searchParams }: PageProps<"/hinh-nen-dong">) {
  const sp = await searchParams;
  const device = parseDevice(typeof sp.device === "string" ? sp.device : undefined);
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = Number(typeof sp.page === "string" ? sp.page : "1") || 1;

  const { items, pageCount } = await getWallpapers({ mediaType: "video", device, q, page });
  const basePath = "/hinh-nen-dong";

  return (
    <AppShell searchQuery={q}>
      <Breadcrumbs items={[{ label: "Trang chủ", href: "/" }, { label: "Video nền" }]} />
      <div className="animate-fade-in-up mb-5">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">🎬 Hình nền động (Live Wallpaper)</h1>
        <p className="mt-1 text-sm text-muted">
          Video nền chuyển động mượt mà, đặt màn hình chờ điện thoại và máy tính sống động hơn.
        </p>
      </div>

      <WallpaperGrid items={items} />
      <Pagination basePath={basePath} page={page} pageCount={pageCount} searchParams={{ device, q }} />
    </AppShell>
  );
}

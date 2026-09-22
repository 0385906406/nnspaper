import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { WallpaperGrid } from "@/components/wallpaper-grid";
import { Pagination } from "@/components/pagination";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getWallpapers, type DeviceFilter } from "@/lib/wallpapers";
import { siteConfig } from "@/lib/site";
import { breadcrumbJsonLd, collectionPageJsonLd, JsonLd, listingCanonical } from "@/lib/seo";
import { robotsFor } from "@/lib/settings";

const TITLE = "Hình nền động (Live Wallpaper) 4K";
const DESCRIPTION = `Kho video nền / hình nền động 4K cho điện thoại và máy tính trên ${siteConfig.name}.`;

function parseDevice(value?: string): DeviceFilter | undefined {
  return value === "pc" || value === "phone" ? value : undefined;
}

export async function generateMetadata({ searchParams }: PageProps<"/hinh-nen-dong">): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = Number(typeof sp.page === "string" ? sp.page : "1") || 1;

  const baseTitle = TITLE;
  // Trang 2+ cần <title> khác trang 1, nếu không Search Console báo tiêu đề trùng lặp.
  const title = page > 1 ? `${baseTitle} - Trang ${page}` : baseTitle;
  const description = DESCRIPTION;

  return {
    title,
    description,
    // Canonical tự trỏ về đúng trang đang xem; trang phân trang vẫn cho index để
    // bot còn đường bò tới những ảnh nằm sâu bên trong.
    alternates: { canonical: listingCanonical("/hinh-nen-dong", page) },
    robots: await robotsFor(Boolean(q)),
    openGraph: { title, description, type: "website", url: listingCanonical("/hinh-nen-dong", page) },
  };
}

export default async function LiveWallpaperPage({ searchParams }: PageProps<"/hinh-nen-dong">) {
  const sp = await searchParams;
  const device = parseDevice(typeof sp.device === "string" ? sp.device : undefined);
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = Number(typeof sp.page === "string" ? sp.page : "1") || 1;

  const { items, pageCount, total } = await getWallpapers({ mediaType: "video", device, q, page });
  const basePath = "/hinh-nen-dong";

  return (
    <AppShell searchQuery={q}>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: "Trang chủ", path: "/" }, { name: "Video nền" }]),
          collectionPageJsonLd({
            name: "Hình nền động (Live Wallpaper) 4K",
            description: DESCRIPTION,
            path: "/hinh-nen-dong",
            page,
            items,
            totalItems: total,
          }),
        ]}
      />
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

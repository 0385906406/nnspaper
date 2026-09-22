import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { WallpaperGrid } from "@/components/wallpaper-grid";
import { Pagination } from "@/components/pagination";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getTrendingWallpapers, type DeviceFilter } from "@/lib/wallpapers";
import { siteConfig } from "@/lib/site";
import { breadcrumbJsonLd, collectionPageJsonLd, JsonLd, listingCanonical } from "@/lib/seo";
import { robotsFor } from "@/lib/settings";

const TITLE = "Thịnh hành - Hình nền được xem và thích nhiều nhất";
const DESCRIPTION = `Những hình nền và video nền được xem, thích nhiều nhất trên ${siteConfig.name}.`;

function parseDevice(value?: string): DeviceFilter | undefined {
  return value === "pc" || value === "phone" ? value : undefined;
}

export async function generateMetadata({ searchParams }: PageProps<"/thinh-hanh">): Promise<Metadata> {
  const sp = await searchParams;
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
    alternates: { canonical: listingCanonical("/thinh-hanh", page) },
    robots: await robotsFor(false),
    openGraph: { title, description, type: "website", url: listingCanonical("/thinh-hanh", page) },
  };
}

export default async function TrendingPage({ searchParams }: PageProps<"/thinh-hanh">) {
  const sp = await searchParams;
  const device = parseDevice(typeof sp.device === "string" ? sp.device : undefined);
  const page = Number(typeof sp.page === "string" ? sp.page : "1") || 1;

  const { items, pageCount, total } = await getTrendingWallpapers({ device, page });
  const basePath = "/thinh-hanh";

  return (
    <AppShell>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: "Trang chủ", path: "/" }, { name: "Thịnh hành" }]),
          collectionPageJsonLd({
            name: "Hình nền thịnh hành",
            description: DESCRIPTION,
            path: "/thinh-hanh",
            page,
            items,
            totalItems: total,
          }),
        ]}
      />
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

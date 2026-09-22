import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { WallpaperGrid } from "@/components/wallpaper-grid";
import { Pagination } from "@/components/pagination";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getWallpapers } from "@/lib/wallpapers";
import { siteConfig } from "@/lib/site";
import { breadcrumbJsonLd, collectionPageJsonLd, JsonLd, listingCanonical } from "@/lib/seo";
import { robotsFor } from "@/lib/settings";

const TITLE = "Hình nền máy tính 4K đẹp nhất";
const DESCRIPTION = `Tổng hợp hình nền desktop, laptop độ phân giải cao (2K, 4K UHD) trên ${siteConfig.name}.`;

export async function generateMetadata({
  searchParams,
}: PageProps<"/hinh-nen-may-tinh">): Promise<Metadata> {
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
    alternates: { canonical: listingCanonical("/hinh-nen-may-tinh", page) },
    robots: await robotsFor(Boolean(q)),
    openGraph: { title, description, type: "website", url: listingCanonical("/hinh-nen-may-tinh", page) },
  };
}

export default async function DesktopWallpaperPage({
  searchParams,
}: PageProps<"/hinh-nen-may-tinh">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = Number(typeof sp.page === "string" ? sp.page : "1") || 1;

  const { items, pageCount, total } = await getWallpapers({ device: "pc", q, page });
  const basePath = "/hinh-nen-may-tinh";

  return (
    <AppShell searchQuery={q}>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: "Trang chủ", path: "/" }, { name: "Hình nền máy tính" }]),
          collectionPageJsonLd({
            name: "Hình nền máy tính 4K",
            description: DESCRIPTION,
            path: "/hinh-nen-may-tinh",
            page,
            items,
            totalItems: total,
          }),
        ]}
      />
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

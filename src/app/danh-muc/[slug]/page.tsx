import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { WallpaperGrid } from "@/components/wallpaper-grid";
import { Pagination } from "@/components/pagination";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getCategoryBySlug, getCategoryTrail } from "@/lib/categories";
import { getWallpapers, type DeviceFilter } from "@/lib/wallpapers";
import { absoluteUrl } from "@/lib/site";
import { robotsFor } from "@/lib/settings";

function parseDevice(value?: string): DeviceFilter | undefined {
  return value === "pc" || value === "phone" ? value : undefined;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/danh-muc/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};

  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = typeof sp.page === "string" ? sp.page : undefined;
  const isFiltered = Boolean(q) || Boolean(page && page !== "1");

  const title = category.seo.metaTitle || `Hình nền ${category.name} 4K đẹp nhất`;
  const description =
    category.seo.metaDescription ||
    category.description ||
    `Tổng hợp hình nền và video nền ${category.name} chất lượng cao cho điện thoại và máy tính.`;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/danh-muc/${category.slug}`) },
    robots: await robotsFor(isFiltered),
    openGraph: { title, description },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/danh-muc/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const device = parseDevice(typeof sp.device === "string" ? sp.device : undefined);
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = Number(typeof sp.page === "string" ? sp.page : "1") || 1;

  const [{ items, pageCount }, trail] = await Promise.all([
    getWallpapers({ categorySlug: slug, device, q, page }),
    getCategoryTrail(slug),
  ]);

  const basePath = `/danh-muc/${slug}`;

  return (
    <AppShell searchQuery={q}>
      <Breadcrumbs
        items={[
          { label: "Trang chủ", href: "/" },
          // Danh mục con hiện đủ đường dẫn: Trang chủ › One Piece › Luffy
          ...trail.map((c, i) =>
            i === trail.length - 1
              ? { label: c.name }
              : { label: c.name, href: `/danh-muc/${c.slug}` }
          ),
        ]}
      />
      <div className="animate-fade-in-up mb-5">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          {category.icon ? `${category.icon} ` : ""}
          Hình nền {category.name}
        </h1>
        {category.description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted">{category.description}</p>
        ) : null}
      </div>

      <WallpaperGrid items={items} />
      <Pagination basePath={basePath} page={page} pageCount={pageCount} searchParams={{ device, q }} />
    </AppShell>
  );
}

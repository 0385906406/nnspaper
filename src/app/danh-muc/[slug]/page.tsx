import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { WallpaperGrid } from "@/components/wallpaper-grid";
import { Pagination } from "@/components/pagination";
import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";
import { getCategoryBySlug, getCategoryTrail } from "@/lib/categories";
import { getWallpapers, type DeviceFilter } from "@/lib/wallpapers";
import { breadcrumbJsonLd, collectionPageJsonLd, JsonLd, listingCanonical } from "@/lib/seo";
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
  const page = Number(typeof sp.page === "string" ? sp.page : "1") || 1;

  const base = category.seo.metaTitle || `Hình nền ${category.name} 4K đẹp nhất`;
  // Trang 2+ phải có <title> khác trang 1, nếu không Search Console báo "tiêu đề
  // trùng lặp" và Google tự chọn một trang để bỏ qua.
  const title = page > 1 ? `${base} - Trang ${page}` : base;
  const description =
    category.seo.metaDescription ||
    category.description ||
    `Tổng hợp hình nền và video nền ${category.name} chất lượng cao cho điện thoại và máy tính.`;

  return {
    title,
    description,
    ...(category.seo.keywords?.length ? { keywords: category.seo.keywords } : {}),
    // Canonical tự trỏ về đúng trang đang xem — xem listingCanonical.
    alternates: { canonical: listingCanonical(`/danh-muc/${category.slug}`, page) },
    // Chỉ chặn index khi có từ khoá tìm kiếm (vô số biến thể, nội dung mỏng).
    // Trang phân trang vẫn cho index: đó là đường duy nhất để bot bò tới ảnh cũ.
    robots: await robotsFor(Boolean(q)),
    openGraph: { title, description, type: "website", url: listingCanonical(`/danh-muc/${category.slug}`, page) },
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

  const [{ items, pageCount, total }, trail] = await Promise.all([
    getWallpapers({ categorySlug: slug, device, q, page }),
    getCategoryTrail(slug),
  ]);

  const basePath = `/danh-muc/${slug}`;

  const crumbs: Crumb[] = [
    { label: "Trang chủ", href: "/" },
    // Danh mục con hiện đủ đường dẫn: Trang chủ › One Piece › Luffy
    ...trail.map((c, i) =>
      i === trail.length - 1 ? { label: c.name } : { label: c.name, href: `/danh-muc/${c.slug}` }
    ),
  ];

  return (
    <AppShell searchQuery={q}>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs.map((c) => ({ name: c.label, path: c.href }))),
          collectionPageJsonLd({
            name: `Hình nền ${category.name}`,
            description:
              category.description ||
              `Tổng hợp hình nền và video nền ${category.name} chất lượng cao.`,
            path: basePath,
            page,
            items,
            totalItems: total,
          }),
        ]}
      />
      <Breadcrumbs items={crumbs} />
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

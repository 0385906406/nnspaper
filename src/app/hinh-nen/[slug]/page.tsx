import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { WallpaperSpecs } from "@/components/wallpaper-specs";
import { WallpaperGrid } from "@/components/wallpaper-grid";
import { HeartButton } from "@/components/heart-button";
import { DownloadButton } from "@/components/download-button";
import { FavoriteButton } from "@/components/favorite-button";
import { ShareButton } from "@/components/share-button";
import { PinMedia } from "@/components/pin-media";
import { PinMoreMenu } from "@/components/pin-more-menu";
import { CommentsSection, CommentJumpButton } from "@/components/comments-section";
import { EyeIcon, DownloadIcon } from "@/components/icons";
import { getWallpaperBySlug, getMoreLikeThis, incrementViews } from "@/lib/wallpapers";
import { getCategories } from "@/lib/categories";
import { isFavorited } from "@/lib/favorites";
import { hasLiked } from "@/lib/likes";
import { getComments } from "@/lib/comments";
import { getCurrentUser, hasPermission } from "@/lib/admin";
import { auth } from "@/auth";
import { absoluteUrl } from "@/lib/site";
import { breadcrumbJsonLd, JsonLd, ORGANIZATION_ID } from "@/lib/seo";
import { getSettings, robotsFor } from "@/lib/settings";
import { formatCount } from "@/lib/format";
import { coverOf } from "@/lib/cover";
import { avatarMascot } from "@/lib/mascots";

/** Số ảnh đề xuất ở cột bên phải (desktop); phần còn lại xếp bên dưới khung chi tiết. */
const SIDE_COUNT = 14;

export async function generateMetadata({
  params,
}: PageProps<"/hinh-nen/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const wallpaper = await getWallpaperBySlug(slug);
  if (!wallpaper) return {};

  const title = wallpaper.seo.metaTitle || `${wallpaper.title} - Hình nền ${wallpaper.categoryName} 4K`;
  const description =
    wallpaper.seo.metaDescription ||
    wallpaper.description ||
    `Tải hình nền ${wallpaper.title} chất lượng cao, thuộc chủ đề ${wallpaper.categoryName}.`;
  const cover = coverOf(wallpaper);

  return {
    title,
    description,
    keywords: wallpaper.seo.keywords?.length ? wallpaper.seo.keywords : wallpaper.tags,
    alternates: { canonical: wallpaper.seo.canonical || absoluteUrl(`/hinh-nen/${wallpaper.slug}`) },
    robots: await robotsFor(wallpaper.seo.noindex),
    openGraph: {
      title,
      description,
      type: "article",
      images: cover.url ? [{ url: cover.url, width: cover.width, height: cover.height }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: cover.url ? [cover.url] : undefined,
    },
  };
}

export default async function WallpaperDetailPage({
  params,
}: PageProps<"/hinh-nen/[slug]">) {
  const { slug } = await params;
  const wallpaper = await getWallpaperBySlug(slug);
  if (!wallpaper) notFound();

  await incrementViews(slug);

  const session = await auth();
  const userId = session?.user?.id;

  const [related, categories, settings, comments, favorited, liked, dbUser, canModerate] = await Promise.all([
    getMoreLikeThis(wallpaper.categorySlug, slug, 40),
    getCategories(),
    getSettings(),
    getComments(slug),
    userId ? isFavorited(userId, slug) : false,
    userId ? hasLiked(userId, slug) : false,
    userId ? getCurrentUser().catch(() => null) : null,
    userId ? hasPermission("comment.delete").catch(() => false) : false,
  ]);

  const category = categories.find((c) => c.slug === wallpaper.categorySlug);
  const commentsEnabled = settings.comments_enabled && wallpaper.allowComments;
  const currentUser = dbUser
    ? {
        id: String(dbUser._id),
        name: dbUser.name || dbUser.email?.split("@")[0] || "Bạn",
        mascot: avatarMascot(dbUser.mascot),
      }
    : null;

  const sideItems = related.slice(0, SIDE_COUNT);
  const belowItems = related.slice(SIDE_COUNT);

  const cover = coverOf(wallpaper);
  const pageUrl = absoluteUrl(`/hinh-nen/${wallpaper.slug}`);
  const isVideo = wallpaper.mediaType === "video";

  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Trang chủ", path: "/" },
      { name: wallpaper.categoryName, path: `/danh-muc/${wallpaper.categorySlug}` },
      { name: wallpaper.title },
    ]),
    {
      "@context": "https://schema.org",
      "@type": isVideo ? "VideoObject" : "ImageObject",
      "@id": `${pageUrl}#media`,
      name: wallpaper.title,
      description: wallpaper.description || wallpaper.title,
      contentUrl: wallpaper.media.url,
      thumbnailUrl: cover.url,
      uploadDate: wallpaper.publishedAt ?? wallpaper.updatedAt,
      // Buộc schema về đúng trang chi tiết: không có khoá này, Google Images có
      // thể dẫn thẳng người xem tới file trên CDN và trang mất lượt truy cập.
      mainEntityOfPage: pageUrl,
      // Dữ liệu cấp phép — điều kiện để ảnh được gắn nhãn "Licensable" trong
      // Google Images, kèm liên kết về trang điều khoản sử dụng.
      license: absoluteUrl("/dieu-khoan-su-dung"),
      acquireLicensePage: pageUrl,
      creator: { "@id": ORGANIZATION_ID },
      ...(wallpaper.source ? { creditText: wallpaper.source } : {}),
      ...(wallpaper.tags.length ? { keywords: wallpaper.tags.join(", ") } : {}),
      ...(isVideo
        ? {}
        : {
            // width/height chỉ hợp lệ cho ImageObject. VideoObject mô tả kích
            // thước qua thumbnail, khai ở đây là sai schema.
            ...(wallpaper.media.width ? { width: wallpaper.media.width } : {}),
            ...(wallpaper.media.height ? { height: wallpaper.media.height } : {}),
            representativeOfPage: true,
          }),
      interactionStatistic: [
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/LikeAction",
          userInteractionCount: wallpaper.likes,
        },
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/CommentAction",
          userInteractionCount: wallpaper.commentCount,
        },
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/WatchAction",
          userInteractionCount: wallpaper.views,
        },
      ],
    },
  ];

  return (
    <AppShell>
      <JsonLd data={jsonLd} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
        <div className="min-w-0 space-y-8">
          {/* Khung chi tiết: ảnh bên trái, thông tin + nhận xét bên phải */}
          <article className="animate-fade-in-up overflow-hidden rounded-[32px] border border-border bg-surface md:grid md:grid-cols-2 short:grid short:grid-cols-2">
            <PinMedia wallpaper={wallpaper} backHref={`/danh-muc/${wallpaper.categorySlug}`} />

            <div className="flex flex-col md:max-h-[calc(100dvh-100px)] md:min-h-[520px] short:max-h-[calc(100dvh-64px)] short:min-h-0">
              <div className="flex items-center gap-0.5 px-3 pt-3 pb-2 sm:px-4">
                <HeartButton
                  slug={wallpaper.slug}
                  initialLiked={liked}
                  initialLikes={wallpaper.likes}
                  loggedIn={Boolean(userId)}
                />
                <CommentJumpButton count={wallpaper.commentCount} />
                <ShareButton slug={wallpaper.slug} title={wallpaper.title} />
                <DownloadButton
                  slug={wallpaper.slug}
                  filename={`${wallpaper.slug}.${wallpaper.media.format || "jpg"}`}
                />
                <PinMoreMenu mediaUrl={wallpaper.media.url} />
                <div className="ml-auto">
                  <FavoriteButton slug={wallpaper.slug} initialFavorited={favorited} loggedIn={Boolean(userId)} />
                </div>
              </div>

              <CommentsSection
                slug={wallpaper.slug}
                initialComments={comments}
                initialTotal={wallpaper.commentCount}
                enabled={commentsEnabled}
                currentUser={currentUser}
                canModerate={canModerate}
              >
                <div className="space-y-4 pt-2 pb-5">
                  <Link
                    href={`/danh-muc/${wallpaper.categorySlug}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:underline"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-base" aria-hidden="true">
                      {category?.icon || "🖼️"}
                    </span>
                    {wallpaper.categoryName}
                  </Link>

                  <h1 className="text-2xl leading-tight font-bold text-foreground sm:text-[28px]">{wallpaper.title}</h1>

                  {wallpaper.description ? (
                    <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                      {wallpaper.description}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <EyeIcon className="h-4 w-4" />
                      {formatCount(wallpaper.views)} lượt xem
                    </span>
                    <span className="flex items-center gap-1">
                      <DownloadIcon className="h-4 w-4" />
                      {formatCount(wallpaper.downloads)} lượt tải
                    </span>
                    {wallpaper.resolutionLabel && (
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 font-semibold text-foreground">
                        {wallpaper.resolutionLabel}
                      </span>
                    )}
                  </div>

                  {wallpaper.tags.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {wallpaper.tags.map((tag) => (
                        <Link
                          key={tag}
                          href={`/?q=${encodeURIComponent(tag)}`}
                          className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-border"
                        >
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  ) : null}

                  <details className="group rounded-2xl bg-surface-2/60 px-4 py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-foreground">
                      Chi tiết hình nền
                      <span className="transition-transform group-open:rotate-180" aria-hidden="true">
                        ▾
                      </span>
                    </summary>
                    <div className="mt-3 space-y-2">
                      <WallpaperSpecs wallpaper={wallpaper} />
                      {wallpaper.source ? (
                        <p className="text-xs text-muted">Nguồn ảnh: {wallpaper.source}</p>
                      ) : null}
                    </div>
                  </details>
                </div>
              </CommentsSection>
            </div>
          </article>

          {/* Mobile/tablet: toàn bộ đề xuất xếp dưới khung chi tiết */}
          {related.length > 0 && (
            <section className="xl:hidden">
              <h2 className="mb-4 text-center text-lg font-bold text-foreground">Xem thêm</h2>
              <WallpaperGrid items={related} columns="[--cols:2] sm:[--cols:3] md:[--cols:4]" priorityCount={0} />
            </section>
          )}

          {/* Desktop: phần đề xuất còn lại sau cột phải */}
          {belowItems.length > 0 && (
            <section className="hidden xl:block">
              <WallpaperGrid
                items={belowItems}
                columns="[--cols:3] 2xl:[--cols:4]"
                sizes="(min-width: 1536px) 12vw, 16vw"
                priorityCount={0}
              />
            </section>
          )}
        </div>

        <aside className="hidden min-w-0 xl:block" aria-label="Hình nền tương tự">
          <WallpaperGrid
            items={sideItems}
            columns="[--cols:3]"
            sizes="(min-width: 1536px) 14vw, 16vw"
            priorityCount={0}
          />
        </aside>
      </div>
    </AppShell>
  );
}

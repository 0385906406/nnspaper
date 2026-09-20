import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { AppShell } from "@/components/app-shell";
import { InfiniteFeed } from "@/components/infinite-feed";
import { SearchResultsBar } from "@/components/search-results-bar";
import { getWallpapers, parseSearchSort, type DeviceFilter } from "@/lib/wallpapers";
import { absoluteUrl } from "@/lib/site";
import { getSettings, robotsFor } from "@/lib/settings";
import { logSearch } from "@/lib/search-log";
import { getNoResultSuggestions } from "@/lib/search-suggest";
import { SearchIcon } from "@/components/icons";

function parseDevice(value?: string): DeviceFilter | undefined {
  return value === "pc" || value === "phone" ? value : undefined;
}

function parseType(value?: string): "image" | "video" | undefined {
  return value === "image" || value === "video" ? value : undefined;
}

function str(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export async function generateMetadata({ searchParams }: PageProps<"/">): Promise<Metadata> {
  const sp = await searchParams;
  const q = str(sp.q)?.trim();
  const page = str(sp.page);
  const isFiltered = Boolean(q) || Boolean(page && page !== "1");

  const settings = await getSettings();

  return {
    // Đặt `title: undefined` sẽ xoá luôn tiêu đề mặc định của layout khiến trang
    // không có thẻ <title> nào, nên chỉ thêm khoá này khi thật sự có tiêu đề riêng.
    ...(q ? { title: `Kết quả tìm kiếm cho "${q}"` } : {}),
    description: settings.site_description,
    alternates: { canonical: absoluteUrl("/") },
    robots: await robotsFor(isFiltered),
  };
}

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const q = str(sp.q)?.trim().slice(0, 100) || undefined;
  const device = parseDevice(str(sp.device));
  const type = q ? parseType(str(sp.type)) : undefined;
  const sort = q ? parseSearchSort(str(sp.sort)) : undefined;
  const page = Math.max(1, Number(str(sp.page) ?? "1") || 1);
  const forbidden = sp.error === "forbidden";

  const [{ items, pageCount, total }, settings] = await Promise.all([
    getWallpapers({ device, q, page, mediaType: type, sort }),
    getSettings(),
  ]);

  // Chỉ tính lượt tìm "gốc" (trang 1, chưa lọc thêm) để thống kê không bị đếm trùng
  if (q && page === 1 && !type && !device && !sort) {
    after(() => logSearch(q, total));
  }

  const suggestions = q && total === 0 ? await getNoResultSuggestions(q) : null;

  return (
    <AppShell searchQuery={q}>
      {forbidden && (
        <p role="alert" className="mb-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          Tài khoản của bạn không có quyền truy cập trang quản trị.
        </p>
      )}

      {q ? (
        <SearchResultsBar filters={{ q, type, device, sort }} total={total} />
      ) : (
        <h1 className="sr-only">{settings.site_name} — Hình nền &amp; video nền 4K cho điện thoại, máy tính</h1>
      )}

      {suggestions ? (
        <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-surface px-6 py-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2">
            <SearchIcon className="h-6 w-6 text-muted" />
          </span>
          <p className="mt-4 text-lg font-bold text-foreground">Không tìm thấy hình nền nào cho “{q}”</p>
          <p className="mt-1 text-sm text-muted">
            Thử kiểm tra chính tả, bỏ bớt bộ lọc hoặc dùng từ khoá ngắn hơn.
          </p>

          {suggestions.keywords.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Có thể bạn muốn tìm</p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.keywords.map((k) => (
                  <Link
                    key={k}
                    href={`/?q=${encodeURIComponent(k)}`}
                    className="rounded-full bg-surface-2 px-4 py-1.5 text-sm font-medium text-foreground hover:bg-border"
                  >
                    {k}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {suggestions.categories.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Hoặc xem theo chủ đề</p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/danh-muc/${c.slug}`}
                    className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground hover:bg-surface-2"
                  >
                    {c.icon ? `${c.icon} ` : ""}
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        // key theo bộ lọc: đổi từ khoá/bộ lọc thì lưới cuộn vô hạn bắt đầu lại từ đầu
        <InfiniteFeed
          key={`${q ?? ""}|${device ?? ""}|${type ?? ""}|${sort ?? ""}|${page}`}
          initialItems={items}
          initialPage={page}
          pageCount={pageCount}
          query={{ q, device, type, sort }}
        />
      )}
    </AppShell>
  );
}

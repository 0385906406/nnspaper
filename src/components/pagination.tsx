import Link from "next/link";
import { pageItems } from "@/lib/pagination";

type Props = {
  basePath: string;
  page: number;
  pageCount: number;
  searchParams?: Record<string, string | undefined>;
};

function hrefFor(basePath: string, page: number, searchParams?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

const ITEM = "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm";

export function Pagination({ basePath, page, pageCount, searchParams }: Props) {
  if (pageCount <= 1) return null;

  const prev = page > 1 ? page - 1 : null;
  const next = page < pageCount ? page + 1 : null;

  return (
    <nav aria-label="Phân trang" className="mt-8 flex justify-center">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1">
        {prev ? (
          <Link
            href={hrefFor(basePath, prev, searchParams)}
            rel="prev"
            className={`${ITEM} text-muted hover:bg-surface hover:text-foreground`}
          >
            ‹ Trước
          </Link>
        ) : (
          <span className={`${ITEM} cursor-not-allowed text-muted opacity-40`}>‹ Trước</span>
        )}

        {pageItems(page, pageCount).map((item, index) =>
          item === null ? (
            <span key={`gap-${index}`} className="px-1 text-xs text-muted">
              …
            </span>
          ) : item === page ? (
            <span
              key={item}
              aria-current="page"
              className={`${ITEM} min-w-8 bg-accent text-center text-accent-foreground shadow-sm`}
            >
              {item}
            </span>
          ) : (
            <Link
              key={item}
              href={hrefFor(basePath, item, searchParams)}
              aria-label={`Trang ${item}`}
              className={`${ITEM} min-w-8 text-center text-muted hover:bg-surface hover:text-foreground`}
            >
              {item}
            </Link>
          )
        )}

        {next ? (
          <Link
            href={hrefFor(basePath, next, searchParams)}
            rel="next"
            className={`${ITEM} text-muted hover:bg-surface hover:text-foreground`}
          >
            Sau ›
          </Link>
        ) : (
          <span className={`${ITEM} cursor-not-allowed text-muted opacity-40`}>Sau ›</span>
        )}
      </div>
    </nav>
  );
}

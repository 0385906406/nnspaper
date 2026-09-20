"use client";

import { pageItems } from "@/lib/pagination";

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export function Pagination({
  pagination,
  onPageChange,
  onLimitChange,
  label = "mục",
}: {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  label?: string;
}) {
  const { page, limit, total, pages } = pagination;

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
        <label className="flex items-center gap-2">
          Hiển thị
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="h-[34px] rounded-lg border border-border bg-surface-2 px-2.5 text-xs font-medium text-foreground focus:border-accent focus:ring-1 focus:ring-accent/30 focus:outline-none"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          {label} / trang
        </label>

        <span className="hidden whitespace-nowrap sm:inline">
          {from}–{to} trong {total}
        </span>
      </div>

      {pages > 1 && (
        <nav
          className="flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1"
          aria-label="Phân trang"
        >
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            ‹ Trước
          </button>

          {pageItems(page, pages).map((item, index) =>
            item === null ? (
              <span key={`gap-${index}`} className="px-1 text-xs text-muted">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === page ? "page" : undefined}
                className={`min-w-8 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  item === page
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted hover:bg-surface hover:text-foreground"
                }`}
              >
                {item}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pages}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Sau ›
          </button>
        </nav>
      )}
    </div>
  );
}

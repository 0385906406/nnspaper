"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WallpaperListResult, WallpaperView } from "@/lib/wallpapers";
import { WallpaperGrid } from "@/components/wallpaper-grid";

type Props = {
  initialItems: WallpaperView[];
  initialPage: number;
  pageCount: number;
  /** Tham số lọc giữ nguyên khi tải trang tiếp theo (q, device...). */
  query: Record<string, string | undefined>;
};

/**
 * Lưới cuộn vô hạn: trang đầu render sẵn từ server, gần chạm đáy thì tự tải trang
 * kế tiếp qua /api/wallpapers và nối vào cùng một lưới (ảnh cũ không bị xếp lại).
 */
export function InfiniteFeed({ initialItems, initialPage, pageCount, query }: Props) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(pageCount);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Chặn gọi trùng khi observer bắn liên tiếp trước lúc state kịp cập nhật
  const busyRef = useRef(false);

  const hasMore = page < total;

  const loadMore = useCallback(async () => {
    if (busyRef.current || page >= total) return;
    busyRef.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const params = new URLSearchParams({ page: String(page + 1) });
      for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);

      const res = await fetch(`/api/wallpapers?${params}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as WallpaperListResult;

      setItems((prev) => {
        // Ảnh mới đăng trong lúc đang cuộn làm lệch trang — bỏ ảnh đã hiện để không trùng
        const seen = new Set(prev.map((w) => w.id));
        return [...prev, ...data.items.filter((w) => !seen.has(w.id))];
      });
      setPage(data.page);
      setTotal(data.pageCount);
    } catch {
      setFailed(true);
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, [page, total, query]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || failed) return;
    // Bắt đầu tải khi còn cách đáy ~1,5 màn hình để người xem không phải chờ
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "0px 0px 150% 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, failed, loadMore]);

  return (
    <>
      <WallpaperGrid items={items} />

      <div ref={sentinelRef} aria-hidden="true" />

      <div className="flex justify-center py-8" aria-live="polite">
        {loading ? (
          <span className="flex items-center gap-2 text-sm text-muted">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
            Đang tải thêm...
          </span>
        ) : failed ? (
          <button
            type="button"
            onClick={loadMore}
            className="rounded-full bg-surface-2 px-5 py-2 text-sm font-semibold text-foreground hover:bg-border"
          >
            Không tải được — thử lại
          </button>
        ) : !hasMore && items.length > 0 ? (
          <span className="text-sm text-muted">Bạn đã xem hết hình nền rồi ✨</span>
        ) : null}
      </div>
    </>
  );
}

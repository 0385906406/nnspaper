"use client";

import { useEffect, useState } from "react";
import type { LikerView } from "@/lib/likes";
import type { PaginationInfo } from "@/components/admin/ui";
import { MascotAvatar } from "@/components/mascot-avatar";

const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Danh sách tài khoản đã thả tim một hình nền, tải thêm theo trang. */
export function WallpaperLikers({ wallpaperId }: { wallpaperId: string }) {
  const [likers, setLikers] = useState<LikerView[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [loadedPage, setLoadedPage] = useState(0);
  const [error, setError] = useState("");
  const loading = !error && loadedPage < page;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/wallpapers/${wallpaperId}/likes?page=${page}&limit=10`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Không tải được danh sách thả tim.");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        // Trang 1 thay mới, các trang sau nối tiếp vào danh sách
        setLikers((prev) => (page === 1 ? data.likers : [...prev, ...data.likers]));
        setPagination(data.pagination);
        setLoadedPage(page);
      })
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [wallpaperId, page]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!loading && likers.length === 0) return <p className="text-sm text-muted">Chưa có ai thả tim.</p>;

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border/40">
        {likers.map((l) => (
          <li key={l.userId} className="flex items-center gap-3 py-2">
            <MascotAvatar mascot={l.mascot} className="h-8 w-8" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{l.name}</p>
              {l.email && <p className="truncate text-xs text-muted">{l.email}</p>}
            </div>
            <span className="shrink-0 text-xs text-muted">{dateFormat.format(new Date(l.likedAt))}</span>
          </li>
        ))}
      </ul>

      {loading && <p className="text-sm text-muted">Đang tải...</p>}

      {!loading && pagination && page < pagination.pages && (
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          className="text-sm font-medium text-accent hover:underline"
        >
          Xem thêm ({pagination.total - likers.length} người nữa)
        </button>
      )}
    </div>
  );
}

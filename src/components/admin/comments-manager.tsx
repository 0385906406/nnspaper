"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  Badge,
  FilterBar,
  SearchInput,
  FilterChips,
  FilterSelect,
  useDebounced,
  Pagination,
  type PaginationInfo,
} from "@/components/admin/ui";

interface AdminComment {
  _id: string;
  wallpaperSlug: string;
  wallpaperTitle?: string;
  userId: string;
  userName?: string;
  content: string;
  /** Bình luận cũ có thể không có trường này — coi như đang hiện. */
  status?: "visible" | "hidden";
  createdAt: string;
}

type BulkAction = "hide" | "show" | "delete";

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "visible", label: "Đang hiện" },
  { value: "hidden", label: "Đã ẩn" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
];

const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function CommentsManager({
  initialWallpaper,
  initialUser,
  canEdit,
  canDelete,
}: {
  initialWallpaper: string;
  initialUser: string;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [hiddenCount, setHiddenCount] = useState(0);
  const [error, setError] = useState("");
  const [loadedKey, setLoadedKey] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [wallpaper, setWallpaper] = useState(initialWallpaper);
  const [user, setUser] = useState(initialUser);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const debouncedSearch = useDebounced(search);

  const hasFilter = Boolean(debouncedSearch || status || wallpaper || user || sort !== "newest");
  const canAct = canEdit || canDelete;
  const colCount = canAct ? 6 : 5;

  // Đổi bộ lọc thì về trang 1: đang ở trang 5 mà lọc còn 2 trang sẽ ra bảng rỗng.
  // Điều chỉnh ngay lúc render thay vì dùng effect để khỏi fetch thừa một lượt.
  const filterKey = JSON.stringify([debouncedSearch, status, wallpaper, user, sort, limit]);
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const params = new URLSearchParams({ page: String(page), limit: String(limit), sort });
  if (debouncedSearch) params.set("q", debouncedSearch);
  if (status) params.set("status", status);
  if (wallpaper) params.set("wallpaper", wallpaper);
  if (user) params.set("user", user);
  const requestKey = `${params}#${reloadKey}`;
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    let cancelled = false;
    const [query] = requestKey.split("#");

    fetch(`/api/admin/comments?${query}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(res.status === 403 ? "Bạn không có quyền xem bình luận." : "Không tải được bình luận.");
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setComments(data.comments ?? []);
        setPagination(data.pagination);
        setHiddenCount(data.hiddenCount ?? 0);
        setError("");
      })
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => {
        if (cancelled) return;
        // Danh sách đã đổi thì bỏ chọn — các dòng đã chọn có thể không còn trên trang
        setSelected(new Set());
        setLoadedKey(requestKey);
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey]);

  function resetFilters() {
    setSearch("");
    setStatus("");
    setWallpaper("");
    setUser("");
    setSort("newest");
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = comments.length > 0 && comments.every((c) => selected.has(c._id));

  async function setCommentStatus(id: string, next: "visible" | "hidden") {
    const res = await fetch(`/api/admin/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Cập nhật thất bại");
      return;
    }
    setComments((list) => list.map((c) => (c._id === id ? { ...c, status: next } : c)));
    setHiddenCount((n) => Math.max(0, n + (next === "hidden" ? 1 : -1)));
  }

  async function deleteOne(comment: AdminComment) {
    if (!confirm(`Xoá bình luận của "${comment.userName}"? Không thể hoàn tác.`)) return;
    const res = await fetch(`/api/admin/comments/${comment._id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Xoá thất bại");
      return;
    }
    setReloadKey((k) => k + 1);
  }

  async function bulk(action: BulkAction) {
    const ids = [...selected];
    if (!ids.length) return;
    if (action === "delete" && !confirm(`Xoá ${ids.length} bình luận? Không thể hoàn tác.`)) return;

    setBusy(true);
    try {
      const res = await fetch("/api/admin/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Thao tác thất bại");
        return;
      }
      setReloadKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">💬 Bình luận</h1>
        <p className="mt-1 text-muted">
          Kiểm duyệt nhận xét của người dùng
          {!loading && !error && ` · ${pagination.total} mục`}
          {hiddenCount > 0 && ` · ${hiddenCount} đang ẩn`}
        </p>
      </div>

      <FilterBar
        onReset={hasFilter ? resetFilters : undefined}
        search={
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo nội dung, người viết, tên hình nền..." />
        }
      >
        <FilterChips label="Trạng thái" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        <FilterSelect label="Sắp xếp" value={sort} onChange={setSort} options={SORT_OPTIONS} />
      </FilterBar>

      {(wallpaper || user) && (
        <div className="flex flex-wrap gap-2 text-sm">
          {wallpaper && (
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-accent">
              Hình nền: <b>{wallpaper}</b>
              <button type="button" onClick={() => setWallpaper("")} aria-label="Bỏ lọc hình nền">
                ✕
              </button>
            </span>
          )}
          {user && (
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-accent">
              Người dùng: <b>#{user.slice(-6)}</b>
              <button type="button" onClick={() => setUser("")} aria-label="Bỏ lọc người dùng">
                ✕
              </button>
            </span>
          )}
        </div>
      )}

      {canAct && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-accent/40 bg-accent/5 px-4 py-3">
          <span className="mr-2 text-sm font-medium text-foreground">Đã chọn {selected.size}</span>
          {canEdit && (
            <>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => bulk("hide")}>
                Ẩn
              </Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => bulk("show")}>
                Hiện lại
              </Button>
            </>
          )}
          {canDelete && (
            <Button size="sm" variant="danger" disabled={busy} onClick={() => bulk("delete")}>
              Xoá
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Bỏ chọn
          </Button>
        </div>
      )}

      {error && <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

      <Table minWidth="60rem">
        <TableHeader>
          <TableRow isHeader>
            {canAct && (
              <TableCell isHeader>
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả"
                  checked={allSelected}
                  onChange={() =>
                    setSelected(allSelected ? new Set() : new Set(comments.map((c) => c._id)))
                  }
                  className="h-4 w-4 accent-[var(--accent)]"
                />
              </TableCell>
            )}
            <TableCell isHeader>Người viết</TableCell>
            <TableCell isHeader>Nội dung</TableCell>
            <TableCell isHeader>Hình nền</TableCell>
            <TableCell isHeader align="center" nowrap>
              Trạng thái
            </TableCell>
            <TableCell isHeader align="center" nowrap>
              Hành động
            </TableCell>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading && <TableEmpty colSpan={colCount}>Đang tải...</TableEmpty>}

          {!loading && !error && comments.length === 0 && (
            <TableEmpty colSpan={colCount}>
              {hasFilter ? "Không có bình luận nào khớp bộ lọc" : "Chưa có bình luận nào"}
            </TableEmpty>
          )}

          {!loading &&
            comments.map((c) => (
              <TableRow key={c._id}>
                {canAct && (
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label="Chọn bình luận"
                      checked={selected.has(c._id)}
                      onChange={() => toggle(c._id)}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                  </TableCell>
                )}

                <TableCell nowrap>
                  <button
                    type="button"
                    onClick={() => setUser(c.userId)}
                    className="text-left hover:text-accent"
                    title="Lọc bình luận của người này"
                  >
                    <p className="font-medium">{c.userName || "Người dùng"}</p>
                    <p className="text-xs text-muted">{dateFormat.format(new Date(c.createdAt))}</p>
                  </button>
                </TableCell>

                <TableCell>
                  <p className={`max-w-md text-sm break-words whitespace-pre-line ${c.status === "hidden" ? "text-muted line-through" : ""}`}>
                    {c.content}
                  </p>
                </TableCell>

                <TableCell>
                  <button
                    type="button"
                    onClick={() => setWallpaper(c.wallpaperSlug)}
                    className="block max-w-[14rem] truncate text-left text-sm hover:text-accent"
                    title="Lọc bình luận của hình nền này"
                  >
                    {c.wallpaperTitle || c.wallpaperSlug}
                  </button>
                  <Link
                    href={`/hinh-nen/${c.wallpaperSlug}#nhan-xet`}
                    target="_blank"
                    className="text-xs text-muted hover:text-accent"
                  >
                    Xem trên trang ↗
                  </Link>
                </TableCell>

                <TableCell align="center" nowrap>
                  {c.status !== "hidden" ? (
                    <Badge tone="success">Đang hiện</Badge>
                  ) : (
                    <Badge tone="warning">Đã ẩn</Badge>
                  )}
                </TableCell>

                <TableCell align="center" nowrap>
                  <div className="flex items-center justify-center gap-2">
                    {canEdit &&
                      (c.status !== "hidden" ? (
                        <Button variant="ghost" size="sm" onClick={() => setCommentStatus(c._id, "hidden")}>
                          Ẩn
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setCommentStatus(c._id, "visible")}>
                          Hiện
                        </Button>
                      ))}
                    {canDelete && (
                      <Button variant="danger" size="sm" onClick={() => deleteOne(c)}>
                        Xoá
                      </Button>
                    )}
                    {!canAct && <span className="text-xs text-muted">Chỉ xem</span>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      <Pagination pagination={pagination} onPageChange={setPage} onLimitChange={setLimit} label="bình luận" />
    </div>
  );
}

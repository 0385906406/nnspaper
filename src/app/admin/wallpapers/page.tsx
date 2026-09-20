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

interface Wallpaper {
  _id: string;
  title: string;
  slug: string;
  status: string;
  mediaType: string;
  categoryName?: string;
  deviceType?: string;
  resolutionLabel?: string;
  views: number;
  likes: number;
  downloads?: number;
  commentCount?: number;
  allowComments?: boolean;
  createdAt: string;
}

interface Category {
  _id: string;
  name: string;
  slug: string;
  icon: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "draft", label: "Nháp" },
  { value: "published", label: "Đã duyệt" },
];

const MEDIA_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "image", label: "🖼️ Ảnh" },
  { value: "video", label: "🎬 Video" },
];

const DEVICE_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "pc", label: "Máy tính" },
  { value: "phone", label: "Điện thoại" },
  { value: "both", label: "Cả hai" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "views", label: "Xem nhiều" },
  { value: "likes", label: "Thích nhiều" },
  { value: "downloads", label: "Tải nhiều" },
  { value: "comments", label: "Nhiều bình luận" },
];

const DEVICE_LABELS: Record<string, string> = {
  pc: "Máy tính",
  phone: "Điện thoại",
  both: "Cả hai",
};

const numberFormat = new Intl.NumberFormat("vi-VN");

export default function WallpapersPage() {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const debouncedSearch = useDebounced(search);

  const hasFilter = Boolean(
    debouncedSearch || status || mediaType || deviceType || category || sort !== "newest"
  );

  // Query chính là "danh tính" của lần tải: dùng luôn nó để biết dữ liệu đang
  // hiển thị có khớp bộ lọc hiện tại chưa, nhờ vậy `loading` là giá trị dẫn xuất
  // thay vì state phải setState trong effect (mỗi lần như thế tốn một lượt render
  // thừa và bị react-hooks/set-state-in-effect chặn).
  const params = new URLSearchParams({ page: String(page), limit: String(limit), sort });
  if (debouncedSearch) params.set("q", debouncedSearch);
  if (status) params.set("status", status);
  if (mediaType) params.set("mediaType", mediaType);
  if (deviceType) params.set("deviceType", deviceType);
  if (category) params.set("category", category);
  const query = params.toString();

  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const loading = loadedQuery !== query;

  // Đổi bộ lọc thì phải về trang 1: đang ở trang 5 mà lọc còn 2 trang sẽ ra bảng
  // rỗng. `debouncedSearch` đổi trễ nên không gắn được vào ô nhập; chỉnh state ngay
  // trong lúc render là cách React khuyến nghị cho trường hợp này, thay vì một
  // useEffect chỉ để setPage.
  const filterKey = `${debouncedSearch}|${status}|${mediaType}|${deviceType}|${category}|${sort}|${limit}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  // Dropdown lọc cần toàn bộ danh mục nên xin hẳn trang đầu cỡ lớn, không theo
  // cỡ trang của bảng hình nền
  useEffect(() => {
    fetch("/api/admin/categories?limit=100")
      .then((res) => (res.ok ? res.json() : { categories: [] }))
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    // Huỷ request cũ khi bộ lọc đổi giữa chừng, nếu không phản hồi đến muộn sẽ
    // ghi đè lên kết quả mới hơn.
    const controller = new AbortController();

    fetch(`/api/admin/wallpapers?${query}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Không tải được danh sách hình nền.");
        return res.json();
      })
      .then((data) => {
        setWallpapers(data.wallpapers ?? []);
        setPagination(data.pagination);
        setError("");
        setLoadedQuery(query);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setError(err.message);
        setLoadedQuery(query);
      });

    return () => controller.abort();
  }, [query]);

  function resetFilters() {
    setSearch("");
    setStatus("");
    setMediaType("");
    setDeviceType("");
    setCategory("");
    setSort("newest");
  }

  async function deleteWallpaper(id: string, title: string) {
    if (!confirm(`Xoá hình nền "${title}"?`)) return;

    const res = await fetch(`/api/admin/wallpapers/${id}`, { method: "DELETE" });
    if (res.ok) {
      setWallpapers((prev) => prev.filter((w) => w._id !== id));
      setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Xoá thất bại");
    }
  }

  async function approveWallpaper(id: string) {
    const res = await fetch(`/api/admin/wallpapers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });

    if (res.ok) {
      setWallpapers((prev) =>
        prev.map((w) => (w._id === id ? { ...w, status: "published" } : w))
      );
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Duyệt thất bại");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">🖼️ Hình nền</h1>
          <p className="mt-1 text-muted">
            Quản lý hình nền &amp; video
            {!loading && !error && ` · ${pagination.total} mục`}
          </p>
        </div>
        <Link href="/admin/wallpapers/upload">
          <Button variant="primary">+ Tải lên</Button>
        </Link>
      </div>

      <FilterBar
        onReset={hasFilter ? resetFilters : undefined}
        search={
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo tiêu đề hoặc tag..."
          />
        }
      >
        <FilterChips
          label="Trạng thái"
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
        />
        <FilterChips label="Loại" value={mediaType} onChange={setMediaType} options={MEDIA_OPTIONS} />
        <FilterChips
          label="Thiết bị"
          value={deviceType}
          onChange={setDeviceType}
          options={DEVICE_OPTIONS}
        />
        <FilterSelect
          label="Danh mục"
          value={category}
          onChange={setCategory}
          options={[
            { value: "", label: "Tất cả" },
            ...categories.map((c) => ({ value: c.slug, label: `${c.icon} ${c.name}` })),
          ]}
        />
        <FilterSelect label="Sắp xếp" value={sort} onChange={setSort} options={SORT_OPTIONS} />
      </FilterBar>

      {error && (
        <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <Table minWidth="64rem">
        <TableHeader>
          <TableRow isHeader>
            <TableCell isHeader>Tiêu đề</TableCell>
            <TableCell isHeader nowrap>
              Danh mục
            </TableCell>
            <TableCell isHeader nowrap>
              Loại
            </TableCell>
            <TableCell isHeader align="right" nowrap>
              Lượt xem
            </TableCell>
            <TableCell isHeader align="right" nowrap>
              Thích
            </TableCell>
            <TableCell isHeader align="right" nowrap>
              Tải về
            </TableCell>
            <TableCell isHeader align="right" nowrap>
              Bình luận
            </TableCell>
            <TableCell isHeader align="center" nowrap>
              Trạng thái
            </TableCell>
            <TableCell isHeader align="center" nowrap>
              Hành động
            </TableCell>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading && <TableEmpty colSpan={9}>Đang tải...</TableEmpty>}

          {!loading && !error && wallpapers.length === 0 && (
            <TableEmpty colSpan={9}>
              {hasFilter ? "Không có hình nền nào khớp bộ lọc" : "Chưa có hình nền nào"}
            </TableEmpty>
          )}

          {!loading &&
            wallpapers.map((w) => (
              <TableRow key={w._id}>
                <TableCell>
                  <p className="font-medium">{w.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {DEVICE_LABELS[w.deviceType ?? ""] ?? w.deviceType}
                    {w.resolutionLabel ? ` · ${w.resolutionLabel}` : ""}
                  </p>
                </TableCell>

                <TableCell nowrap>
                  <span className="text-muted">{w.categoryName ?? "—"}</span>
                </TableCell>

                <TableCell nowrap>
                  {w.mediaType === "video" ? "🎬 Video" : "🖼️ Ảnh"}
                </TableCell>

                <TableCell align="right" nowrap>
                  {numberFormat.format(w.views ?? 0)}
                </TableCell>
                <TableCell align="right" nowrap>
                  {numberFormat.format(w.likes ?? 0)}
                </TableCell>
                <TableCell align="right" nowrap>
                  {numberFormat.format(w.downloads ?? 0)}
                </TableCell>
                <TableCell align="right" nowrap>
                  <Link
                    href={`/admin/comments?wallpaper=${encodeURIComponent(w.slug)}`}
                    className="hover:text-accent hover:underline"
                    title="Xem bình luận của hình nền này"
                  >
                    {numberFormat.format(w.commentCount ?? 0)}
                  </Link>
                  {w.allowComments === false && (
                    <span className="ml-1 text-xs text-muted" title="Đã tắt bình luận">
                      🔕
                    </span>
                  )}
                </TableCell>

                <TableCell align="center" nowrap>
                  {w.status === "published" ? (
                    <Badge tone="success">✓ Đã duyệt</Badge>
                  ) : (
                    <Badge tone="warning">⏳ Nháp</Badge>
                  )}
                </TableCell>

                <TableCell align="center" nowrap>
                  <div className="flex items-center justify-center gap-2">
                    {w.status === "draft" && (
                      <Button variant="ghost" size="sm" onClick={() => approveWallpaper(w._id)}>
                        Duyệt
                      </Button>
                    )}
                    <Link href={`/admin/wallpapers/${w._id}`}>
                      <Button variant="ghost" size="sm">
                        Sửa
                      </Button>
                    </Link>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteWallpaper(w._id, w.title)}
                    >
                      Xoá
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      <Pagination
        pagination={pagination}
        onPageChange={setPage}
        onLimitChange={setLimit}
        label="hình nền"
      />
    </div>
  );
}

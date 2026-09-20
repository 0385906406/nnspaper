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
  FilterBar,
  SearchInput,
  useDebounced,
  Pagination,
  type PaginationInfo,
} from "@/components/admin/ui";

interface Category {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  order: number;
  parentId?: string | null;
}

/**
 * Xếp danh mục con ngay dưới cha để bảng đọc được theo cây, thay vì trộn lẫn
 * theo `order` khiến "Luffy" có thể nằm cách "One Piece" mấy dòng.
 */
function sortByHierarchy(categories: Category[]): { row: Category; depth: number }[] {
  const roots = categories.filter((c) => !c.parentId);
  const out: { row: Category; depth: number }[] = [];

  for (const root of roots) {
    out.push({ row: root, depth: 0 });
    for (const child of categories.filter((c) => c.parentId === root._id)) {
      out.push({ row: child, depth: 1 });
    }
  }

  // Danh mục con có cha đã bị lọc khỏi trang hiện tại (do tìm kiếm) vẫn phải hiện
  const shown = new Set(out.map((o) => o.row._id));
  for (const c of categories) if (!shown.has(c._id)) out.push({ row: c, depth: 0 });

  return out;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const debouncedSearch = useDebounced(search);

  // Query chính là "danh tính" của lần tải: dùng luôn nó để biết dữ liệu đang
  // hiển thị có khớp bộ lọc hiện tại chưa, nhờ vậy `loading` là giá trị dẫn xuất
  // thay vì state phải setState trong effect (mỗi lần như thế tốn một lượt render
  // thừa và bị react-hooks/set-state-in-effect chặn).
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (debouncedSearch) params.set("q", debouncedSearch);
  const query = params.toString();

  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const loading = loadedQuery !== query;

  // Đổi bộ lọc thì phải về trang 1, nhưng `debouncedSearch` đổi trễ nên không gắn
  // được vào ô nhập. Chỉnh state ngay trong lúc render là cách React khuyến nghị
  // cho trường hợp này, thay vì một useEffect chỉ để setPage.
  const filterKey = `${debouncedSearch}|${limit}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/admin/categories?${query}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Không tải được danh sách danh mục.");
        return res.json();
      })
      .then((data) => {
        setCategories(data.categories ?? []);
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

  async function deleteCategory(id: string, name: string) {
    if (!confirm(`Xoá danh mục "${name}"?`)) return;

    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c._id !== id));
      setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Xoá thất bại");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">📁 Danh mục</h1>
          <p className="mt-1 text-muted">
            Quản lý danh mục hình nền
            {!loading && !error && ` · ${pagination.total} danh mục`}
          </p>
        </div>
        <Link href="/admin/categories/create">
          <Button variant="primary">+ Tạo mới</Button>
        </Link>
      </div>

      <FilterBar
        onReset={search ? () => setSearch("") : undefined}
        search={
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo tên, slug hoặc mô tả..."
          />
        }
      />

      {error && (
        <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <Table>
        <TableHeader>
          <TableRow isHeader>
            <TableCell isHeader align="center" nowrap>
              Thứ tự
            </TableCell>
            <TableCell isHeader>Tên</TableCell>
            <TableCell isHeader>Slug</TableCell>
            <TableCell isHeader>Mô tả</TableCell>
            <TableCell isHeader align="center" nowrap>
              Hành động
            </TableCell>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading && <TableEmpty colSpan={5}>Đang tải...</TableEmpty>}

          {!loading && !error && categories.length === 0 && (
            <TableEmpty colSpan={5}>
              {debouncedSearch ? "Không có danh mục nào khớp từ khoá" : "Chưa có danh mục nào"}
            </TableEmpty>
          )}

          {!loading &&
            sortByHierarchy(categories).map(({ row: category, depth }) => (
              <TableRow key={category._id}>
                <TableCell align="center" nowrap>
                  <span className="text-muted">{category.order}</span>
                </TableCell>

                <TableCell nowrap>
                  <div className="flex items-center gap-2" style={{ paddingLeft: depth * 20 }}>
                    {depth > 0 && <span className="text-muted/60">↳</span>}
                    <span className="text-xl">{category.icon}</span>
                    <span className={depth > 0 ? "" : "font-medium"}>{category.name}</span>
                  </div>
                </TableCell>

                <TableCell nowrap>
                  <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-muted">
                    {category.slug}
                  </code>
                </TableCell>

                <TableCell>
                  <span className="line-clamp-2 text-muted">{category.description || "—"}</span>
                </TableCell>

                <TableCell align="center" nowrap>
                  <div className="flex items-center justify-center gap-2">
                    <Link href={`/admin/categories/${category._id}`}>
                      <Button variant="ghost" size="sm">
                        Sửa
                      </Button>
                    </Link>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteCategory(category._id, category.name)}
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
        label="danh mục"
      />
    </div>
  );
}

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
  useDebounced,
  Pagination,
  type PaginationInfo,
} from "@/components/admin/ui";

interface User {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Quản trị viên",
  editor: "Biên tập viên",
  viewer: "Người xem",
};

const ROLE_TONES: Record<string, "accent" | "success" | "neutral"> = {
  admin: "accent",
  editor: "success",
  viewer: "neutral",
};

const ROLE_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "admin", label: "Quản trị viên" },
  { value: "editor", label: "Biên tập viên" },
  { value: "viewer", label: "Người xem" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "active", label: "Hoạt động" },
  { value: "disabled", label: "Đã khoá" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const debouncedSearch = useDebounced(search);

  const hasFilter = Boolean(debouncedSearch || role || status);

  // Query chính là "danh tính" của lần tải: dùng luôn nó để biết dữ liệu đang
  // hiển thị có khớp bộ lọc hiện tại chưa, nhờ vậy `loading` là giá trị dẫn xuất
  // thay vì state phải setState trong effect (mỗi lần như thế tốn một lượt render
  // thừa và bị react-hooks/set-state-in-effect chặn).
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (debouncedSearch) params.set("q", debouncedSearch);
  if (role) params.set("role", role);
  if (status) params.set("status", status);
  const query = params.toString();

  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const loading = loadedQuery !== query;

  // Đổi bộ lọc thì phải về trang 1: đang ở trang 5 mà lọc còn 2 trang sẽ ra bảng
  // rỗng. `debouncedSearch` đổi trễ nên không gắn được vào ô nhập; chỉnh state ngay
  // trong lúc render là cách React khuyến nghị cho trường hợp này, thay vì một
  // useEffect chỉ để setPage.
  const filterKey = `${debouncedSearch}|${role}|${status}|${limit}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  useEffect(() => {
    // Huỷ request cũ khi bộ lọc đổi giữa chừng, nếu không phản hồi đến muộn sẽ
    // ghi đè lên kết quả mới hơn.
    const controller = new AbortController();

    fetch(`/api/admin/users?${query}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Không tải được danh sách người dùng.");
        return res.json();
      })
      .then((data) => {
        setUsers(data.users ?? []);
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

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Xoá người dùng "${name}"?`)) return;

    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u._id !== id));
      setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Xoá thất bại");
    }
  }

  function resetFilters() {
    setSearch("");
    setRole("");
    setStatus("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">👥 Người dùng</h1>
          <p className="mt-1 text-muted">
            Quản lý tài khoản người dùng
            {!loading && !error && ` · ${pagination.total} tài khoản`}
          </p>
        </div>
        <Link href="/admin/users/create">
          <Button variant="primary">+ Tạo mới</Button>
        </Link>
      </div>

      <FilterBar
        onReset={hasFilter ? resetFilters : undefined}
        search={
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo tên, email, SĐT..."
          />
        }
      >
        <FilterChips label="Vai trò" value={role} onChange={setRole} options={ROLE_OPTIONS} />
        <FilterChips
          label="Trạng thái"
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
        />
      </FilterBar>

      {error && (
        <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <Table>
        <TableHeader>
          <TableRow isHeader>
            <TableCell isHeader>Tên</TableCell>
            <TableCell isHeader>Email</TableCell>
            <TableCell isHeader nowrap>
              SĐT
            </TableCell>
            <TableCell isHeader align="center" nowrap>
              Vai trò
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
          {loading && <TableEmpty colSpan={6}>Đang tải...</TableEmpty>}

          {!loading && !error && users.length === 0 && (
            <TableEmpty colSpan={6}>
              {hasFilter ? "Không có tài khoản nào khớp bộ lọc" : "Chưa có người dùng nào"}
            </TableEmpty>
          )}

          {!loading &&
            users.map((user) => (
              <TableRow key={user._id}>
                <TableCell nowrap>
                  <span className="font-medium">{user.name}</span>
                </TableCell>
                <TableCell nowrap>
                  <span className="text-muted">{user.email || "—"}</span>
                </TableCell>
                <TableCell nowrap>
                  <span className="text-muted">{user.phone || "—"}</span>
                </TableCell>
                <TableCell align="center" nowrap>
                  <Badge tone={ROLE_TONES[user.role] ?? "neutral"}>
                    {ROLE_LABELS[user.role] ?? user.role}
                  </Badge>
                </TableCell>
                <TableCell align="center" nowrap>
                  {user.isActive ? (
                    <Badge tone="success">✓ Hoạt động</Badge>
                  ) : (
                    <Badge tone="neutral">✗ Đã khoá</Badge>
                  )}
                </TableCell>
                <TableCell align="center" nowrap>
                  <div className="flex items-center justify-center gap-2">
                    <Link href={`/admin/users/${user._id}`}>
                      <Button variant="ghost" size="sm">
                        Sửa
                      </Button>
                    </Link>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteUser(user._id, user.name)}
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
        label="tài khoản"
      />
    </div>
  );
}

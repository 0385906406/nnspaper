"use client";

import { useEffect, useState } from "react";
import {
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
  FilterDateRange,
  useDebounced,
  Pagination,
  type PaginationInfo,
} from "@/components/admin/ui";

interface AuditLog {
  _id: string;
  userId: string;
  userName?: string;
  action: string;
  resource: string;
  resourceId?: string;
  message: string;
  status: string;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Tạo",
  UPDATE: "Cập nhật",
  DELETE: "Xoá",
  PUBLISH: "Đăng",
  LOGIN: "Đăng nhập",
};

const ACTION_TONES: Record<string, "success" | "accent" | "danger" | "neutral"> = {
  CREATE: "success",
  UPDATE: "accent",
  PUBLISH: "success",
  DELETE: "danger",
};

const RESOURCE_LABELS: Record<string, string> = {
  user: "Người dùng",
  category: "Danh mục",
  wallpaper: "Hình nền",
  comment: "Bình luận",
  setting: "Cài đặt",
  role: "Vai trò",
};

const RESOURCE_ICONS: Record<string, string> = {
  user: "👥",
  category: "📁",
  wallpaper: "🖼️",
  comment: "💬",
  setting: "⚙️",
  role: "👤",
};

const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const RESOURCE_OPTIONS = [
  { value: "", label: "Tất cả" },
  ...Object.keys(RESOURCE_LABELS).map((key) => ({
    value: key,
    label: `${RESOURCE_ICONS[key]} ${RESOURCE_LABELS[key]}`,
  })),
];

const ACTION_OPTIONS = [
  { value: "", label: "Tất cả hành động" },
  ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
];

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "success", label: "Thành công" },
  { value: "failed", label: "Thất bại" },
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [resource, setResource] = useState("");
  const [action, setAction] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const debouncedSearch = useDebounced(search);

  const hasFilter = Boolean(debouncedSearch || resource || action || status || from || to);

  // Query chính là "danh tính" của lần tải: dùng luôn nó để biết dữ liệu đang
  // hiển thị có khớp bộ lọc hiện tại chưa, nhờ vậy `loading` là giá trị dẫn xuất
  // thay vì state phải setState trong effect (mỗi lần như thế tốn một lượt render
  // thừa và bị react-hooks/set-state-in-effect chặn).
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (debouncedSearch) params.set("q", debouncedSearch);
  if (resource) params.set("resource", resource);
  if (action) params.set("action", action);
  if (status) params.set("status", status);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();

  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const loading = loadedQuery !== query;

  // Đổi bộ lọc thì phải về trang 1: đang ở trang 5 mà lọc còn 2 trang sẽ ra bảng
  // rỗng. `debouncedSearch` đổi trễ nên không gắn được vào ô nhập; chỉnh state ngay
  // trong lúc render là cách React khuyến nghị cho trường hợp này, thay vì một
  // useEffect chỉ để setPage.
  const filterKey = `${debouncedSearch}|${resource}|${action}|${status}|${from}|${to}|${limit}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  useEffect(() => {
    // Huỷ request cũ khi bộ lọc đổi giữa chừng, nếu không phản hồi đến muộn sẽ
    // ghi đè lên kết quả mới hơn.
    const controller = new AbortController();

    fetch(`/api/admin/audit-logs?${query}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 403 ? "Bạn không có quyền xem nhật ký." : "Không tải được nhật ký."
          );
        }
        return res.json();
      })
      .then((data) => {
        setLogs(data.logs ?? []);
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
    setResource("");
    setAction("");
    setStatus("");
    setFrom("");
    setTo("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">📋 Audit Logs</h1>
        <p className="mt-1 text-muted">
          Lịch sử hoạt động quản trị
          {!loading && !error && ` · ${pagination.total} bản ghi`}
        </p>
      </div>

      <FilterBar
        onReset={hasFilter ? resetFilters : undefined}
        search={
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo nội dung hoặc người thực hiện..."
          />
        }
      >
        <FilterChips
          label="Đối tượng"
          value={resource}
          onChange={setResource}
          options={RESOURCE_OPTIONS}
        />
        <FilterSelect label="Hành động" value={action} onChange={setAction} options={ACTION_OPTIONS} />
        <FilterChips label="Kết quả" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        <FilterDateRange from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      </FilterBar>

      {error && (
        <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <Table minWidth="60rem">
        <TableHeader>
          <TableRow isHeader>
            <TableCell isHeader nowrap>
              Thời gian
            </TableCell>
            <TableCell isHeader nowrap>
              Hành động
            </TableCell>
            <TableCell isHeader nowrap>
              Đối tượng
            </TableCell>
            <TableCell isHeader>Nội dung</TableCell>
            <TableCell isHeader nowrap>
              Người thực hiện
            </TableCell>
            <TableCell isHeader align="center" nowrap>
              Kết quả
            </TableCell>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading && <TableEmpty colSpan={6}>Đang tải...</TableEmpty>}

          {!loading && !error && logs.length === 0 && (
            <TableEmpty colSpan={6}>
              {hasFilter ? "Không có bản ghi nào khớp bộ lọc" : "Chưa có hoạt động nào"}
            </TableEmpty>
          )}

          {!loading &&
            logs.map((log) => (
              <TableRow key={log._id}>
                <TableCell nowrap>
                  <span className="text-muted">{dateFormat.format(new Date(log.createdAt))}</span>
                </TableCell>

                <TableCell nowrap>
                  <Badge tone={ACTION_TONES[log.action] ?? "neutral"}>
                    {ACTION_LABELS[log.action] ?? log.action}
                  </Badge>
                </TableCell>

                <TableCell nowrap>
                  <span className="mr-1">{RESOURCE_ICONS[log.resource] ?? "📝"}</span>
                  {RESOURCE_LABELS[log.resource] ?? log.resource}
                  {log.resourceId && (
                    <span className="ml-1 text-xs text-muted">#{log.resourceId.slice(-6)}</span>
                  )}
                </TableCell>

                <TableCell>
                  <span className="text-muted">{log.message}</span>
                </TableCell>

                <TableCell nowrap>{log.userName || log.userId}</TableCell>

                <TableCell align="center" nowrap>
                  {log.status === "success" ? (
                    <Badge tone="success">✓ Thành công</Badge>
                  ) : (
                    <Badge tone="danger">✗ Thất bại</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      <Pagination
        pagination={pagination}
        onPageChange={setPage}
        onLimitChange={setLimit}
        label="bản ghi"
      />
    </div>
  );
}

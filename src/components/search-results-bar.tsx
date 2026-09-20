import Link from "next/link";
import type { DeviceFilter, SearchSort } from "@/lib/wallpapers";

type Filters = {
  q: string;
  type?: "image" | "video";
  device?: DeviceFilter;
  sort?: SearchSort;
};

function hrefWith(filters: Filters, patch: Partial<Filters>): string {
  const next = { ...filters, ...patch };
  const params = new URLSearchParams({ q: next.q });
  if (next.type) params.set("type", next.type);
  if (next.device) params.set("device", next.device);
  if (next.sort && next.sort !== "relevance") params.set("sort", next.sort);
  return `/?${params}`;
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors ${
        active ? "bg-foreground text-background" : "bg-surface-2 text-foreground hover:bg-border"
      }`}
    >
      {children}
    </Link>
  );
}

/** Tiêu đề + bộ lọc của trang kết quả tìm kiếm. Mỗi chip là một link, không cần JS. */
export function SearchResultsBar({ filters, total }: { filters: Filters; total: number }) {
  const groups: { label: string; items: { label: string; patch: Partial<Filters>; active: boolean }[] }[] = [
    {
      label: "Loại",
      items: [
        { label: "Tất cả", patch: { type: undefined }, active: !filters.type },
        { label: "Ảnh", patch: { type: "image" }, active: filters.type === "image" },
        { label: "Video", patch: { type: "video" }, active: filters.type === "video" },
      ],
    },
    {
      label: "Thiết bị",
      items: [
        { label: "Mọi thiết bị", patch: { device: undefined }, active: !filters.device },
        { label: "Máy tính", patch: { device: "pc" }, active: filters.device === "pc" },
        { label: "Điện thoại", patch: { device: "phone" }, active: filters.device === "phone" },
      ],
    },
    {
      label: "Sắp xếp",
      items: [
        { label: "Liên quan nhất", patch: { sort: "relevance" }, active: !filters.sort || filters.sort === "relevance" },
        { label: "Mới nhất", patch: { sort: "newest" }, active: filters.sort === "newest" },
        { label: "Nhiều tim", patch: { sort: "likes" }, active: filters.sort === "likes" },
      ],
    },
  ];

  return (
    <div className="mb-5 space-y-3">
      <h1 className="text-xl font-bold text-foreground sm:text-2xl">
        Kết quả cho “{filters.q}”
        <span className="ml-2 text-sm font-normal text-muted">{total.toLocaleString("vi-VN")} hình nền</span>
      </h1>
      <div className="scrollbar-none flex items-center gap-2 overflow-x-auto pb-1">
        {groups.map((group, g) => (
          <div key={group.label} className="flex shrink-0 items-center gap-2" role="group" aria-label={group.label}>
            {g > 0 && <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden="true" />}
            {group.items.map((item) => (
              <Chip key={item.label} href={hrefWith(filters, item.patch)} active={item.active}>
                {item.label}
              </Chip>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

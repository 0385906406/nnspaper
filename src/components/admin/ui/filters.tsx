"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Giá trị chỉ được đẩy ra ngoài sau khi người dùng ngừng gõ `delay` ms — nếu
 * gọi API theo từng phím thì mỗi từ khoá sẽ bắn cả chục request.
 */
export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Tìm kiếm...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full sm:max-w-sm">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-surface-2 py-2.5 pr-9 pl-9 text-sm text-foreground placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Xoá từ khoá"
          className="absolute top-1/2 right-2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-foreground"
        >
          ×
        </button>
      )}
    </div>
  );
}

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * Mỗi bộ lọc là một khối có nhãn riêng ở trên. Nhãn nằm cùng dòng với các nút
 * sẽ khiến nhóm này dính vào nhóm kia, nhìn như một dãy nút dài không phân biệt được.
 */
function FilterGroup({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

/** Nhóm nút bấm cho các lựa chọn ít (trạng thái, loại...). */
export function FilterChips({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  label?: string;
}) {
  return (
    <FilterGroup label={label}>
      {/* Viền bao ngoài gom các nút thành một khối liền, tách hẳn khỏi nhóm bên cạnh */}
      <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface-2 p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              value === option.value
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </FilterGroup>
  );
}

/** Dropdown cho các lựa chọn nhiều (danh mục, sắp xếp...). */
export function FilterSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  label: string;
}) {
  return (
    <FilterGroup label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-[38px] min-w-40 rounded-lg border border-border bg-surface-2 px-3 text-xs font-medium text-foreground focus:border-accent focus:ring-1 focus:ring-accent/30 focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FilterGroup>
  );
}

/** Khoảng ngày, dựng chung kiểu với các bộ lọc khác thay vì hai ô rời rạc. */
export function FilterDateRange({
  from,
  to,
  onFromChange,
  onToChange,
  label = "Khoảng ngày",
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  label?: string;
}) {
  const inputClass =
    "h-[38px] rounded-lg border border-border bg-surface-2 px-2.5 text-xs text-foreground focus:border-accent focus:ring-1 focus:ring-accent/30 focus:outline-none";

  return (
    <FilterGroup label={label}>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => onFromChange(e.target.value)}
          aria-label="Từ ngày"
          className={inputClass}
        />
        <span className="text-xs text-muted">–</span>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => onToChange(e.target.value)}
          aria-label="Đến ngày"
          className={inputClass}
        />
      </div>
    </FilterGroup>
  );
}

/**
 * Ô tìm kiếm tách hẳn lên hàng trên, các nhóm lọc xuống hàng dưới. Dồn tất cả
 * vào một hàng cuộn ngang sẽ khiến ô tìm kiếm bị bóp lại còn vài chục pixel.
 */
export function FilterBar({
  search,
  children,
  onReset,
}: {
  search?: ReactNode;
  children?: ReactNode;
  onReset?: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface">
      {search && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          {search}
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted transition-colors hover:border-danger/40 hover:text-danger"
            >
              ✕ Xoá bộ lọc
            </button>
          )}
        </div>
      )}

      {children && (
        <div
          className={`flex flex-wrap items-end gap-x-6 gap-y-4 p-4 ${
            search ? "border-t border-border/60 pt-4" : ""
          }`}
        >
          {children}
          {!search && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted transition-colors hover:border-danger/40 hover:text-danger"
            >
              ✕ Xoá bộ lọc
            </button>
          )}
        </div>
      )}
    </div>
  );
}

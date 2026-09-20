import type { ReactNode } from "react";

interface TableProps {
  children: ReactNode;
  /** Bảng nhiều cột cần rộng tối thiểu để không bị bóp chữ; phần thừa sẽ cuộn ngang. */
  minWidth?: string;
}

interface TableCellProps {
  children: ReactNode;
  isHeader?: boolean;
  align?: "left" | "center" | "right";
  /** Giữ nội dung trên một dòng, dùng cho cột số liệu và cột hành động. */
  nowrap?: boolean;
  className?: string;
  colSpan?: number;
}

export function Table({ children, minWidth = "48rem" }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full border-collapse text-left" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children }: { children: ReactNode }) {
  // sticky để tiêu đề cột còn thấy được khi bảng dài và người dùng cuộn xuống
  return (
    <thead className="sticky top-0 z-10 bg-surface-2">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border/40">{children}</tbody>;
}

export function TableRow({ children, isHeader }: { children: ReactNode; isHeader?: boolean }) {
  return (
    <tr className={isHeader ? "border-b border-border" : "transition-colors hover:bg-surface-2/60"}>
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  isHeader,
  align = "left",
  nowrap,
  className = "",
  colSpan,
}: TableCellProps) {
  const alignClass = { left: "text-left", center: "text-center", right: "text-right" }[align];
  const shared = `px-4 py-3 sm:px-5 ${alignClass} ${nowrap ? "whitespace-nowrap" : ""} ${className}`;

  if (isHeader) {
    return (
      <th
        scope="col"
        colSpan={colSpan}
        className={`${shared} text-xs font-semibold tracking-wide text-muted uppercase`}
      >
        {children}
      </th>
    );
  }

  return (
    <td colSpan={colSpan} className={`${shared} text-sm text-foreground`}>
      {children}
    </td>
  );
}

/** Dòng chiếm trọn bảng cho trạng thái đang tải / rỗng / lỗi. */
export function TableEmpty({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center text-sm text-muted">
        {children}
      </td>
    </tr>
  );
}

/** Nhãn tròn nhiều màu dùng chung cho cột trạng thái/vai trò. */
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
}) {
  const tones = {
    neutral: "bg-foreground/10 text-muted",
    success: "bg-green-500/15 text-green-500",
    warning: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-500",
    danger: "bg-danger/15 text-danger",
    accent: "bg-accent/15 text-accent",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

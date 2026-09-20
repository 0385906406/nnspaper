import Link from "next/link";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/admin";
import { getSearchSummary, getTopTerms, type TermStat } from "@/lib/search-log";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  Badge,
} from "@/components/admin/ui";

export const metadata = { title: "Tìm kiếm" };

const RANGES = [7, 30, 90] as const;
const numberFormat = new Intl.NumberFormat("vi-VN");
const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function TermTable({ rows, empty, zero }: { rows: TermStat[]; empty: string; zero?: boolean }) {
  return (
    <Table minWidth="32rem">
      <TableHeader>
        <TableRow isHeader>
          <TableCell isHeader>#</TableCell>
          <TableCell isHeader>Từ khoá</TableCell>
          <TableCell isHeader align="right" nowrap>
            Lượt tìm
          </TableCell>
          {!zero && (
            <TableCell isHeader align="right" nowrap>
              Kết quả
            </TableCell>
          )}
          <TableCell isHeader align="right" nowrap>
            Lần cuối
          </TableCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && <TableEmpty colSpan={zero ? 4 : 5}>{empty}</TableEmpty>}
        {rows.map((r, i) => (
          <TableRow key={r.term}>
            <TableCell>
              <span className="text-muted">{i + 1}</span>
            </TableCell>
            <TableCell>
              <Link
                href={`/?q=${encodeURIComponent(r.display)}`}
                target="_blank"
                className="font-medium hover:text-accent hover:underline"
              >
                {r.display}
              </Link>
            </TableCell>
            <TableCell align="right" nowrap>
              {numberFormat.format(r.count)}
            </TableCell>
            {!zero && (
              <TableCell align="right" nowrap>
                {r.lastResults === 0 ? (
                  <Badge tone="danger">0</Badge>
                ) : (
                  numberFormat.format(r.lastResults)
                )}
              </TableCell>
            )}
            <TableCell align="right" nowrap>
              <span className="text-xs text-muted">{dateFormat.format(new Date(r.lastAt))}</span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default async function AdminSearchPage({ searchParams }: PageProps<"/admin/search">) {
  if (!(await hasPermission("wallpaper.view"))) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  const requested = Number(typeof sp.days === "string" ? sp.days : "30");
  const days = (RANGES as readonly number[]).includes(requested) ? requested : 30;
  const [top, zero, summary] = await Promise.all([
    getTopTerms(days, 30),
    getTopTerms(days, 30, true),
    getSearchSummary(days),
  ]);

  const zeroRate = summary.searches ? Math.round((summary.zero / summary.searches) * 100) : 0;

  const cards = [
    { label: "Lượt tìm kiếm", value: numberFormat.format(summary.searches), icon: "🔎" },
    { label: "Từ khoá khác nhau", value: numberFormat.format(summary.terms), icon: "🏷️" },
    { label: "Không ra kết quả", value: `${zeroRate}%`, icon: "🚫", hint: `${numberFormat.format(summary.zero)} lượt` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">🔎 Tìm kiếm</h1>
          <p className="mt-1 text-muted">
            Người dùng đang tìm gì — dùng để quyết định nên đăng thêm hình nền nào.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-1" role="group" aria-label="Khoảng thời gian">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/search?days=${r}`}
              aria-current={r === days ? "true" : undefined}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                r === days ? "bg-accent text-accent-foreground" : "text-muted hover:bg-surface hover:text-foreground"
              }`}
            >
              {r} ngày
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-surface p-5">
            <p className="text-sm text-muted">
              {c.icon} {c.label}
            </p>
            <p className="mt-2 text-3xl font-bold text-foreground">{c.value}</p>
            {c.hint && <p className="mt-1 text-xs text-muted">{c.hint}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">Từ khoá được tìm nhiều</h2>
          <TermTable rows={top} empty="Chưa có lượt tìm kiếm nào trong khoảng này" />
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">Từ khoá không có kết quả</h2>
          <p className="-mt-1 text-sm text-muted">
            Người dùng muốn xem nhưng web chưa có — gợi ý nội dung nên đăng thêm.
          </p>
          <TermTable rows={zero} empty="Tuyệt! Mọi lượt tìm đều có kết quả" zero />
        </section>
      </div>

      <p className="text-xs text-muted">
        Chỉ lưu từ khoá và số kết quả, không lưu người tìm. Dữ liệu tự xoá sau 90 ngày.
      </p>
    </div>
  );
}

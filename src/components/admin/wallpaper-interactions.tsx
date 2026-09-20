import Link from "next/link";
import { Comment } from "@/models/Comment";
import { WallpaperLike } from "@/models/WallpaperLike";
import { WallpaperLikers } from "@/components/admin/wallpaper-likers";
import { VISIBLE } from "@/lib/comments";

const numberFormat = new Intl.NumberFormat("vi-VN");
const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

type Props = {
  wallpaperId: string;
  slug: string;
  views: number;
  downloads: number;
  likes: number;
};

/** Khối "Tương tác" trong trang sửa hình nền: số liệu, ai đã thả tim, bình luận gần đây. */
export async function WallpaperInteractions({ wallpaperId, slug, views, downloads, likes }: Props) {
  const [likeRecords, visibleComments, hiddenComments, recent] = await Promise.all([
    WallpaperLike.countDocuments({ wallpaperSlug: slug }),
    Comment.countDocuments({ wallpaperSlug: slug, ...VISIBLE }),
    Comment.countDocuments({ wallpaperSlug: slug, status: "hidden" }),
    Comment.find({ wallpaperSlug: slug })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean<{ _id: unknown; userName?: string; content: string; status: string; createdAt: Date }[]>(),
  ]);

  const stats = [
    { label: "Lượt xem", value: views, icon: "👁️" },
    { label: "Lượt tải", value: downloads, icon: "⬇️" },
    // likes có thể gồm lượt thích cũ trước khi có hệ thống tim theo tài khoản
    { label: "Lượt tim", value: likes, icon: "❤️", hint: likes !== likeRecords ? `${likeRecords} từ tài khoản` : "" },
    { label: "Bình luận", value: visibleComments, icon: "💬", hint: hiddenComments ? `${hiddenComments} đang ẩn` : "" },
  ];

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Tương tác</h2>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">
              {s.icon} {s.label}
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">{numberFormat.format(s.value)}</p>
            {s.hint && <p className="mt-0.5 text-[11px] text-muted">{s.hint}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Người đã thả tim</h3>
          <WallpaperLikers wallpaperId={wallpaperId} />
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Bình luận gần đây</h3>
            <Link
              href={`/admin/comments?wallpaper=${encodeURIComponent(slug)}`}
              className="text-xs font-medium text-accent hover:underline"
            >
              Quản lý tất cả →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">Chưa có bình luận.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {recent.map((c) => (
                <li key={String(c._id)} className="py-2">
                  <p className={`text-sm break-words ${c.status === "hidden" ? "text-muted line-through" : "text-foreground"}`}>
                    <b className="mr-1">{c.userName || "Người dùng"}</b>
                    {c.content}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {dateFormat.format(new Date(c.createdAt))}
                    {c.status === "hidden" && " · đã ẩn"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

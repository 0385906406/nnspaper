import { User } from "@/models/User";
import { Wallpaper } from "@/models/Wallpaper";
import { Category } from "@/models/Category";
import { AuditLog } from "@/models/AuditLog";
import { Comment } from "@/models/Comment";
import { WallpaperLike } from "@/models/WallpaperLike";
import Link from "next/link";

async function getDashboardStats() {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const [userCount, wallpaperCount, categoryCount, commentCount, hiddenComments, commentsThisWeek, likeCount, likesThisWeek] =
    await Promise.all([
      User.countDocuments(),
      Wallpaper.countDocuments({ status: "published" }),
      Category.countDocuments(),
      Comment.countDocuments(),
      Comment.countDocuments({ status: "hidden" }),
      Comment.countDocuments({ createdAt: { $gte: since } }),
      WallpaperLike.countDocuments(),
      WallpaperLike.countDocuments({ createdAt: { $gte: since } }),
    ]);

  return {
    userCount,
    wallpaperCount,
    categoryCount,
    commentCount,
    hiddenComments,
    commentsThisWeek,
    likeCount,
    likesThisWeek,
  };
}

async function getRecentComments() {
  return Comment.find()
    .sort({ createdAt: -1 })
    .limit(6)
    .lean<
      { _id: unknown; userName?: string; content: string; wallpaperTitle?: string; wallpaperSlug: string; status: string; createdAt: Date }[]
    >();
}

async function getTopLiked() {
  return Wallpaper.find({ status: "published" })
    .sort({ likes: -1, commentCount: -1 })
    .limit(5)
    .select({ title: 1, likes: 1, commentCount: 1 })
    .lean<{ _id: unknown; title: string; likes: number; commentCount?: number }[]>();
}

type RecentLog = {
  action: string;
  resource: string;
  message?: string;
  createdAt: Date;
};

async function getRecentLogs() {
  return AuditLog.find().sort({ createdAt: -1 }).limit(10).lean<RecentLog[]>();
}

export default async function AdminDashboard() {
  const [stats, logs, recentComments, topLiked] = await Promise.all([
    getDashboardStats(),
    getRecentLogs(),
    getRecentComments(),
    getTopLiked(),
  ]);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-2 text-muted">Chào mừng đến Admin Panel</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Tổng người dùng</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{stats.userCount}</p>
            </div>
            <span className="text-4xl">👥</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Hình nền</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{stats.wallpaperCount}</p>
            </div>
            <span className="text-4xl">🖼️</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Danh mục</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{stats.categoryCount}</p>
            </div>
            <span className="text-4xl">📁</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/admin/comments"
          className="rounded-xl border border-border bg-surface p-6 transition-colors hover:border-accent/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Bình luận</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{stats.commentCount}</p>
              <p className="mt-1 text-xs text-muted">
                +{stats.commentsThisWeek} trong 7 ngày
                {stats.hiddenComments > 0 && ` · ${stats.hiddenComments} đang ẩn`}
              </p>
            </div>
            <span className="text-4xl">💬</span>
          </div>
        </Link>

        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Lượt thả tim</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{stats.likeCount}</p>
              <p className="mt-1 text-xs text-muted">+{stats.likesThisWeek} trong 7 ngày</p>
            </div>
            <span className="text-4xl">❤️</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Bình luận mới</h2>
            <Link href="/admin/comments" className="text-xs font-medium text-accent hover:underline">
              Xem tất cả →
            </Link>
          </div>
          {recentComments.length === 0 ? (
            <p className="text-sm text-muted">Chưa có bình luận</p>
          ) : (
            <ul className="space-y-3">
              {recentComments.map((c) => (
                <li key={String(c._id)} className="border-b border-border/30 pb-3 last:border-0">
                  <p className="line-clamp-2 text-sm text-foreground">
                    <b className="mr-1">{c.userName || "Người dùng"}</b>
                    {c.content}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    tại{" "}
                    <Link href={`/admin/comments?wallpaper=${encodeURIComponent(c.wallpaperSlug)}`} className="hover:text-accent">
                      {c.wallpaperTitle || c.wallpaperSlug}
                    </Link>
                    {" · "}
                    {new Date(c.createdAt).toLocaleDateString("vi-VN")}
                    {c.status === "hidden" && " · đã ẩn"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-bold text-foreground">Được thả tim nhiều nhất</h2>
          {topLiked.length === 0 ? (
            <p className="text-sm text-muted">Chưa có dữ liệu</p>
          ) : (
            <ol className="space-y-3">
              {topLiked.map((w, i) => (
                <li key={String(w._id)} className="flex items-center gap-3">
                  <span className="w-5 text-sm font-bold text-muted">{i + 1}</span>
                  <Link href={`/admin/wallpapers/${String(w._id)}`} className="min-w-0 flex-1 truncate text-sm text-foreground hover:text-accent">
                    {w.title}
                  </Link>
                  <span className="shrink-0 text-xs text-muted">
                    ❤️ {w.likes} · 💬 {w.commentCount ?? 0}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-bold text-foreground">Hoạt động gần đây</h2>

        <div className="space-y-3">
          {logs.length > 0 ? (
            logs.map((log, i) => (
              <div key={i} className="flex items-center justify-between border-b border-border/30 pb-3 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{log.action}</p>
                  <p className="text-xs text-muted">{log.message || log.resource}</p>
                </div>
                <p className="text-xs text-muted">
                  {new Date(log.createdAt).toLocaleDateString("vi-VN")}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">Chưa có hoạt động</p>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/admin/users"
          className="rounded-xl border border-accent/30 bg-accent/5 p-6 hover:border-accent/60 hover:bg-accent/10 transition-colors"
        >
          <p className="text-lg font-bold text-accent">Quản lý người dùng</p>
          <p className="mt-2 text-sm text-muted">Thêm, sửa, xóa người dùng</p>
        </Link>

        <Link
          href="/admin/settings"
          className="rounded-xl border border-accent/30 bg-accent/5 p-6 hover:border-accent/60 hover:bg-accent/10 transition-colors"
        >
          <p className="text-lg font-bold text-accent">Cài đặt hệ thống</p>
          <p className="mt-2 text-sm text-muted">Quản lý logo, email, cấu hình</p>
        </Link>
      </div>
    </div>
  );
}

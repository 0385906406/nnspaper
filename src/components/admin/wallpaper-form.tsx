"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/admin/ui";

type Media = {
  url: string;
  publicId: string;
  resourceType: "image" | "video";
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  duration?: number;
  alt: string;
};

export type WallpaperFormValues = {
  _id?: string;
  title: string;
  slug: string;
  description: string;
  categorySlug: string;
  deviceType: "pc" | "phone" | "both";
  mediaType: "image" | "video";
  media: Media | null;
  thumbnail: Media | null;
  resolutionLabel: string;
  tags: string[];
  source: string;
  status: "draft" | "published";
  allowComments: boolean;
};

const EMPTY: WallpaperFormValues = {
  title: "",
  slug: "",
  description: "",
  categorySlug: "",
  deviceType: "both",
  mediaType: "image",
  media: null,
  thumbnail: null,
  resolutionLabel: "",
  tags: [],
  source: "",
  status: "draft",
  allowComments: true,
};

const INPUT =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30 focus:outline-none";
const LABEL = "block text-xs font-semibold tracking-wide text-muted uppercase mb-1.5";

function formatBytes(n?: number) {
  if (!n) return "";
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.round(n / 1024)}KB`;
}

/** Gửi yêu cầu xoá file chưa lưu; keepalive để vẫn gửi được khi đang rời trang. */
function discardUpload(publicId: string, type: Media["resourceType"]) {
  const params = new URLSearchParams({ publicId, type });
  fetch(`/api/admin/wallpapers/upload?${params}`, { method: "DELETE", keepalive: true }).catch(() => {});
}

/** Ô chọn file: bấm chọn hoặc kéo thả, tải lên ngay rồi hiện xem trước. */
function MediaPicker({
  kind,
  value,
  accept,
  hint,
  onUploaded,
  onClear,
}: {
  kind: "media" | "thumbnail";
  value: Media | null;
  accept: string;
  hint: string;
  onUploaded: (media: Media, resolutionLabel: string) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    setError("");
    const body = new FormData();
    body.append("kind", kind);
    body.append("file", file);

    try {
      const res = await fetch("/api/admin/wallpapers/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Tải lên thất bại.");
        return;
      }
      onUploaded(data.media, data.resolutionLabel);
    } catch {
      setError("Không kết nối được máy chủ.");
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) upload(file);
        }}
        className={`flex items-center gap-4 rounded-lg border border-dashed p-4 transition-colors ${
          dragging ? "border-accent bg-accent/5" : "border-border"
        }`}
      >
        {value ? (
          value.resourceType === "video" ? (
            <video
              src={value.url}
              muted
              playsInline
              className="h-24 w-24 shrink-0 rounded-lg border border-border bg-surface-2 object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value.url}
              alt=""
              className="h-24 w-24 shrink-0 rounded-lg border border-border bg-surface-2 object-cover"
            />
          )
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-2xl text-muted">
            🖼️
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => ref.current?.click()}
              isLoading={uploading}
            >
              {value ? "Đổi file" : "Chọn file"}
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={uploading}>
                Gỡ
              </Button>
            )}
          </div>

          {value ? (
            <p className="mt-2 text-xs text-muted">
              {value.width}×{value.height}
              {value.format ? ` · ${value.format.toUpperCase()}` : ""}
              {value.bytes ? ` · ${formatBytes(value.bytes)}` : ""}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted">{hint}</p>
          )}
        </div>

        <input
          ref={ref}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }}
        />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function WallpaperForm({ initial }: { initial?: WallpaperFormValues }) {
  const router = useRouter();
  const isEdit = Boolean(initial?._id);

  const [values, setValues] = useState<WallpaperFormValues>(initial ?? EMPTY);
  const [categories, setCategories] = useState<{ slug: string; name: string; icon: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Slug tự sinh theo tiêu đề cho tới khi admin sửa tay, sau đó thôi ghi đè
  const [slugTouched, setSlugTouched] = useState(isEdit);
  // File đã tải lên Cloudinary trong phiên này nhưng chưa được lưu vào hình nền.
  // Bị thay/gỡ, hoặc rời trang mà không lưu, thì xoá đi để không thành file mồ côi.
  const pendingRef = useRef(new Map<string, Media["resourceType"]>());
  const savedRef = useRef(false);

  useEffect(() => {
    const pending = pendingRef.current;
    function discardAll() {
      if (savedRef.current) return;
      for (const [publicId, type] of pending) discardUpload(publicId, type);
      pending.clear();
    }
    window.addEventListener("pagehide", discardAll);
    return () => {
      window.removeEventListener("pagehide", discardAll);
      discardAll();
    };
  }, []);

  function track(media: Media) {
    pendingRef.current.set(media.publicId, media.resourceType);
  }

  /** Bỏ một file: chỉ xoá trên Cloudinary nếu đó là file mới tải, chưa lưu. */
  function discard(media: Media | null) {
    if (!media) return;
    const type = pendingRef.current.get(media.publicId);
    if (!type) return;
    pendingRef.current.delete(media.publicId);
    discardUpload(media.publicId, type);
  }

  useEffect(() => {
    fetch("/api/admin/categories?limit=100")
      .then((res) => (res.ok ? res.json() : { categories: [] }))
      .then((data) => {
        const list = data.categories ?? [];
        setCategories(list);
        setValues((v) => (v.categorySlug ? v : { ...v, categorySlug: list[0]?.slug ?? "" }));
      })
      .catch(() => setCategories([]));
  }, []);

  function set<K extends keyof WallpaperFormValues>(key: K, value: WallpaperFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setError("");
  }

  function setTitle(title: string) {
    setValues((v) => ({
      ...v,
      title,
      slug: slugTouched ? v.slug : slugify(title),
    }));
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch(
        isEdit ? `/api/admin/wallpapers/${initial!._id}` : "/api/admin/wallpapers",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Lưu thất bại.");
        return;
      }

      savedRef.current = true;
      pendingRef.current.clear();
      router.push("/admin/wallpapers");
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Tệp nội dung</h2>

        <div className="mb-4 inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1">
          {(["image", "video"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => set("mediaType", m)}
              aria-pressed={values.mediaType === m}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                values.mediaType === m
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted hover:bg-surface hover:text-foreground"
              }`}
            >
              {m === "image" ? "🖼️ Ảnh" : "🎬 Video"}
            </button>
          ))}
        </div>

        <MediaPicker
          kind="media"
          value={values.media}
          accept={values.mediaType === "video" ? "video/*" : "image/*"}
          hint={
            values.mediaType === "video"
              ? "MP4 hoặc WEBM, tối đa 100MB. Kéo thả vào đây cũng được."
              : "JPG, PNG hoặc WEBP, tối đa 15MB. Kéo thả vào đây cũng được."
          }
          onUploaded={(media, resolutionLabel) => {
            discard(values.media);
            track(media);
            setValues((v) => ({
              ...v,
              media,
              resolutionLabel: v.resolutionLabel || resolutionLabel,
              // Ảnh dọc là hình nền điện thoại, ảnh ngang là máy tính — đoán sẵn
              // cho admin, vẫn đổi lại được bên dưới
              deviceType:
                media.width && media.height
                  ? media.height > media.width
                    ? "phone"
                    : "pc"
                  : v.deviceType,
            }));
            setError("");
          }}
          onClear={() => {
            discard(values.media);
            set("media", null);
          }}
        />

        {values.mediaType === "video" && (
          <div className="mt-4">
            <label className={LABEL}>Ảnh đại diện (bắt buộc với video)</label>
            <MediaPicker
              kind="thumbnail"
              value={values.thumbnail}
              accept="image/*"
              hint="Khung hình đại diện hiển thị ở danh sách, để card không phải tải cả video."
              onUploaded={(media) => {
                discard(values.thumbnail);
                track(media);
                set("thumbnail", media);
              }}
              onClear={() => {
                discard(values.thumbnail);
                set("thumbnail", null);
              }}
            />
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Thông tin</h2>

        <div>
          <label className={LABEL} htmlFor="title">
            Tiêu đề
          </label>
          <input
            id="title"
            value={values.title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Hoàng hôn trên biển"
            className={INPUT}
            required
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="slug">
            Đường dẫn (slug)
          </label>
          <input
            id="slug"
            value={values.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", e.target.value);
            }}
            placeholder="tu-dong-tao-tu-tieu-de"
            className={`${INPUT} font-mono text-xs`}
          />
          <p className="mt-1 text-xs text-muted">/hinh-nen/{values.slug || "…"}</p>
        </div>

        <div>
          <label className={LABEL} htmlFor="description">
            Mô tả
          </label>
          <textarea
            id="description"
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            maxLength={500}
            className={INPUT}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="category">
              Danh mục
            </label>
            <select
              id="category"
              value={values.categorySlug}
              onChange={(e) => set("categorySlug", e.target.value)}
              className={INPUT}
              required
            >
              <option value="">— Chọn danh mục —</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL} htmlFor="device">
              Thiết bị phù hợp
            </label>
            <select
              id="device"
              value={values.deviceType}
              onChange={(e) => set("deviceType", e.target.value as WallpaperFormValues["deviceType"])}
              className={INPUT}
            >
              <option value="both">Cả hai</option>
              <option value="pc">Máy tính</option>
              <option value="phone">Điện thoại</option>
            </select>
          </div>

          <div>
            <label className={LABEL} htmlFor="resolution">
              Nhãn độ phân giải
            </label>
            <input
              id="resolution"
              value={values.resolutionLabel}
              onChange={(e) => set("resolutionLabel", e.target.value)}
              placeholder="Tự suy ra từ kích thước"
              className={INPUT}
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="source">
              Nguồn / tác giả
            </label>
            <input
              id="source"
              value={values.source}
              onChange={(e) => set("source", e.target.value)}
              placeholder="VD: Pinterest"
              className={INPUT}
            />
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="tags">
            Thẻ (cách nhau bằng dấu phẩy)
          </label>
          <input
            id="tags"
            value={values.tags.join(", ")}
            onChange={(e) =>
              set(
                "tags",
                e.target.value.split(",").map((t) => t.trim()).filter(Boolean)
              )
            }
            placeholder="anime, genshin, furina"
            className={INPUT}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Xuất bản</h2>
        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1">
          {(["draft", "published"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set("status", s)}
              aria-pressed={values.status === s}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                values.status === s
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted hover:bg-surface hover:text-foreground"
              }`}
            >
              {s === "draft" ? "Nháp" : "Đăng ngay"}
            </button>
          ))}
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={values.allowComments}
            onChange={(e) => set("allowComments", e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
          />
          <span>
            <span className="block text-sm font-medium text-foreground">Cho phép bình luận</span>
            <span className="block text-xs text-muted">
              Tắt thì trang chi tiết hiện “Đã tắt nhận xét”, bình luận cũ vẫn giữ nguyên.
            </span>
          </span>
        </label>
      </section>

      {error && (
        <div role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" isLoading={saving}>
          {isEdit ? "Lưu thay đổi" : "Tạo hình nền"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>
          Huỷ
        </Button>
      </div>
    </form>
  );
}

/** Bản rút gọn của makeSlug phía server — chỉ để xem trước khi gõ, server vẫn chuẩn hoá lại. */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

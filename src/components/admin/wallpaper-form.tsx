"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TagsInput } from "@/components/admin/ui";
import { limitFor, resolutionLabelFor } from "@/lib/upload-limits";

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
  provider: "cloudinary" | "r2";
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
function discardUpload(publicId: string, type: Media["resourceType"], provider: Media["provider"]) {
  const params = new URLSearchParams({ publicId, type, provider });
  fetch(`/api/admin/wallpapers/upload?${params}`, { method: "DELETE", keepalive: true }).catch(() => {});
}

/**
 * Lấy thông báo lỗi từ response, chịu được cả khi thân phản hồi không phải JSON.
 *
 * Trước đây form gọi thẳng `res.json()` rồi mới xét `res.ok`, nên mỗi lần hạ tầng
 * trả trang HTML (413 quá cỡ, 504 quá giờ) thì chính bước parse ném lỗi và rơi
 * vào nhánh "Không kết nối được máy chủ" — lỗi thật bị giấu mất.
 */
async function errorFrom(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.error === "string") return data.error;
  } catch {
    // Không parse được nghĩa là lỗi đến từ hạ tầng, mã trạng thái là manh mối duy nhất
  }
  return `${fallback} (HTTP ${res.status})`;
}

type CloudinaryResult = {
  secure_url: string;
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  duration?: number;
};

/**
 * Đẩy file thẳng lên Cloudinary bằng XMLHttpRequest.
 *
 * Dùng XHR chứ không phải fetch vì chỉ XHR báo được tiến độ tải lên: video tới
 * 100MB mà thanh trạng thái đứng im thì admin sẽ tưởng trang bị treo và bấm lại.
 */
function uploadToCloudinary(
  url: string,
  body: FormData,
  onProgress: (percent: number) => void
): Promise<CloudinaryResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      let data: CloudinaryResult & { error?: { message?: string } };
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error(`Cloudinary trả về phản hồi không đọc được (HTTP ${xhr.status}).`));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.error?.message ?? `Cloudinary từ chối file (HTTP ${xhr.status}).`));
    };

    xhr.onerror = () => reject(new Error("Mất kết nối tới Cloudinary khi đang tải lên."));
    xhr.onabort = () => reject(new Error("Đã huỷ tải lên."));

    xhr.send(body);
  });
}

/** Tải một file lên Cloudinary bằng chữ ký từ server, trả về media đã chuẩn hoá. */
async function cloudinaryUpload(
  file: Blob,
  isVideo: boolean,
  onProgress: (percent: number) => void
): Promise<{ media: Media; resolutionLabel: string }> {
  const signRes = await fetch("/api/admin/wallpapers/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resourceType: isVideo ? "video" : "image" }),
  });
  if (!signRes.ok) throw new Error(await errorFrom(signRes, "Không xin được chữ ký tải lên."));

  const { cloudName, apiKey, resourceType, params } = await signRes.json();

  const body = new FormData();
  body.append("file", file);
  body.append("api_key", apiKey);
  for (const [key, value] of Object.entries(params)) body.append(key, String(value));

  const result = await uploadToCloudinary(
    "https://api.cloudinary.com/v1_1/" + cloudName + "/" + resourceType + "/upload",
    body,
    onProgress
  );

  return {
    media: {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      duration: result.duration,
      alt: "",
      provider: "cloudinary",
    },
    resolutionLabel: resolutionLabelFor(result.width, result.height),
  };
}

type VideoProbe = { width: number; height: number; duration: number; poster: Blob | null };

/**
 * Đọc kích thước, thời lượng và cắt khung hình đầu của video ngay trong trình duyệt.
 *
 * Cần thiết vì R2 chỉ là kho chứa byte: khác Cloudinary, nó không trả về metadata
 * và không cắt được poster. Không có poster thì card phải nhúng cả thẻ <video> chỉ
 * để hiện một khung hình tĩnh, rất tốn băng thông của người xem.
 */
function probeVideo(file: File): Promise<VideoProbe> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;

    // Hỏng ở bước nào cũng không được chặn việc tải lên: thiếu metadata thì badge
    // độ phân giải để trống, thiếu poster thì admin tự tải ảnh đại diện như cũ.
    const done = (probe: VideoProbe) => {
      URL.revokeObjectURL(url);
      resolve(probe);
    };

    video.onerror = () => done({ width: 0, height: 0, duration: 0, poster: null });

    video.onloadeddata = () => {
      // Khung 0 của nhiều clip là màn hình đen vì fade-in, nhích lên một chút
      video.currentTime = Math.min(0.1, (video.duration || 1) / 2);
    };

    video.onseeked = () => {
      const meta = {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: Math.round(video.duration || 0),
      };
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return done({ ...meta, poster: null });
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((poster) => done({ ...meta, poster }), "image/jpeg", 0.85);
      } catch {
        done({ ...meta, poster: null });
      }
    };
  });
}

/** PUT thẳng một file lên URL đã ký của R2, có báo tiến độ. */
function putToR2(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    // Content-Type phải khớp đúng giá trị đã dùng lúc ký, lệch một ký tự là chữ ký sai
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error("R2 từ chối file (HTTP " + xhr.status + "). Kiểm tra cấu hình CORS của bucket."));
    };
    xhr.onerror = () =>
      reject(new Error("Không gửi được file lên R2. Bucket đã bật CORS cho tên miền này chưa?"));

    xhr.send(file);
  });
}

/** Ô chọn file: bấm chọn hoặc kéo thả, tải lên ngay rồi hiện xem trước. */
function MediaPicker({
  kind,
  value,
  accept,
  hint,
  r2Enabled = false,
  onUploaded,
  onClear,
}: {
  kind: "media" | "thumbnail";
  value: Media | null;
  accept: string;
  hint: string;
  /** Video sẽ vào R2 nên trần dung lượng cao hơn nhiều so với Cloudinary. */
  r2Enabled?: boolean;
  /** Tham số poster chỉ có khi video vào R2: khung hình đầu đã cắt và tải lên sẵn. */
  onUploaded: (media: Media, resolutionLabel: string, poster?: Media) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  /**
   * File đi thẳng từ trình duyệt lên kho lưu, không qua máy chủ Next.js — function
   * trên Vercel chỉ nhận request body tối đa 4.5MB nên không làm trung gian được.
   *
   * Video ưu tiên vào R2 (trần 4GB, băng thông ra miễn phí), ảnh và poster ở lại
   * Cloudinary vì cần nén và cắt khung hình. Chưa cấu hình R2 thì route ký trả 503
   * và video lặng lẽ quay về Cloudinary như trước, chỉ là bị chặn ở 100MB.
   */
  async function upload(file: File) {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    // Kiểm tra ngay tại client: file không đi qua server nữa nên đây là chốt chặn
    if (!isVideo && !isImage) {
      setError("Chỉ nhận file ảnh hoặc video.");
      return;
    }
    if (kind === "thumbnail" && !isImage) {
      setError("Ảnh đại diện phải là file ảnh.");
      return;
    }

    const limit = limitFor(isVideo, isVideo && r2Enabled);
    if (file.size > limit.bytes) {
      setError("File quá lớn (" + formatBytes(file.size) + "). Tối đa " + limit.label + ".");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError("");

    try {
      if (isVideo) {
        const signRes = await fetch("/api/admin/wallpapers/upload/r2-sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, contentType: file.type }),
        });

        if (signRes.ok) {
          const { key, uploadUrl, publicUrl } = await signRes.json();

          // Đọc metadata trước khi tải: R2 không trả về kích thước hay thời lượng
          const probe = await probeVideo(file);
          await putToR2(uploadUrl, file, setProgress);

          // Poster bắt buộc phải nằm ở Cloudinary — R2 không cắt được khung hình.
          // Thất bại thì vẫn lưu được, admin chỉ cần tự tải ảnh đại diện.
          let poster: Media | undefined;
          if (probe.poster) {
            try {
              poster = (await cloudinaryUpload(probe.poster, false, () => {})).media;
            } catch (e) {
              console.error("Không tải được poster tự cắt:", e);
            }
          }

          onUploaded(
            {
              url: publicUrl,
              publicId: key,
              resourceType: "video",
              width: probe.width || undefined,
              height: probe.height || undefined,
              format: file.name.split(".").pop()?.toLowerCase(),
              bytes: file.size,
              duration: probe.duration || undefined,
              alt: "",
              provider: "r2",
            },
            resolutionLabelFor(probe.width, probe.height),
            poster
          );
          return;
        }

        // 503 nghĩa là chưa cấu hình R2 -> rơi xuống dùng Cloudinary bên dưới
        if (signRes.status !== 503) {
          setError(await errorFrom(signRes, "Không chuẩn bị được chỗ lưu video."));
          return;
        }
      }

      const { media, resolutionLabel } = await cloudinaryUpload(file, isVideo, setProgress);
      onUploaded(media, resolutionLabel);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải lên thất bại.");
    } finally {
      setUploading(false);
      setProgress(0);
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

          {uploading ? (
            // Video lớn tải mất hàng chục giây — không có tiến độ thì admin tưởng treo
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted">
                {progress < 100 ? `Đang tải lên… ${progress}%` : "Cloudinary đang xử lý file…"}
              </p>
            </div>
          ) : value ? (
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
  // Video vào R2 hay Cloudinary quyết định trần dung lượng hiện trong gợi ý
  const [r2Enabled, setR2Enabled] = useState(false);
  // File đã tải lên Cloudinary trong phiên này nhưng chưa được lưu vào hình nền.
  // Bị thay/gỡ, hoặc rời trang mà không lưu, thì xoá đi để không thành file mồ côi.
  // Nhớ cả provider: cùng một publicId phải gọi đúng kho mới xoá được
  const pendingRef = useRef(new Map<string, Pick<Media, "resourceType" | "provider">>());
  const savedRef = useRef(false);

  useEffect(() => {
    const pending = pendingRef.current;
    function discardAll() {
      if (savedRef.current) return;
      for (const [publicId, at] of pending) discardUpload(publicId, at.resourceType, at.provider);
      pending.clear();
    }
    window.addEventListener("pagehide", discardAll);
    return () => {
      window.removeEventListener("pagehide", discardAll);
      discardAll();
    };
  }, []);

  function track(media: Media) {
    pendingRef.current.set(media.publicId, {
      resourceType: media.resourceType,
      provider: media.provider,
    });
  }

  /** Bỏ một file: chỉ xoá khỏi kho nếu đó là file mới tải, chưa lưu. */
  function discard(media: Media | null) {
    if (!media) return;
    const at = pendingRef.current.get(media.publicId);
    if (!at) return;
    pendingRef.current.delete(media.publicId);
    discardUpload(media.publicId, at.resourceType, at.provider);
  }

  useEffect(() => {
    fetch("/api/admin/wallpapers/upload/r2-sign")
      .then((res) => (res.ok ? res.json() : { enabled: false }))
      .then((data) => setR2Enabled(Boolean(data.enabled)))
      .catch(() => setR2Enabled(false));
  }, []);

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
            // Lấy trần từ chính hằng số dùng để kiểm tra, để text và luật không lệch nhau
            values.mediaType === "video"
              ? `MP4 hoặc WEBM, tối đa ${limitFor(true, r2Enabled).label}${
                  r2Enabled ? " (lưu trên R2)" : ""
                }. Kéo thả vào đây cũng được.`
              : `JPG, PNG hoặc WEBP, tối đa ${limitFor(false).label}. Kéo thả vào đây cũng được.`
          }
          r2Enabled={r2Enabled}
          onUploaded={(media, resolutionLabel, poster) => {
            discard(values.media);
            track(media);
            // Video trên R2 không cắt được khung hình khi phát, nên poster đã được
            // cắt sẵn ở trình duyệt được đặt luôn làm ảnh đại diện. Admin vẫn đổi được.
            if (poster) track(poster);
            setValues((v) => ({
              ...v,
              media,
              thumbnail: poster ?? v.thumbnail,
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
            <label className={LABEL}>Ảnh đại diện (tuỳ chọn)</label>
            <MediaPicker
              kind="thumbnail"
              value={values.thumbnail}
              accept="image/*"
              hint="Để trống thì tự lấy khung hình đầu của video. Chỉ cần tải ảnh lên nếu muốn chọn khung khác."
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
            Thẻ
          </label>
          <TagsInput
            id="tags"
            value={values.tags}
            onChange={(tags) => set("tags", tags)}
            max={20}
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

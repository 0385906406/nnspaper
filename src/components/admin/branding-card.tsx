"use client";

import { useRef, useState } from "react";

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30 focus:outline-none";

/** Ô chọn ảnh: bấm để mở hộp thoại file, hoặc kéo thả, hoặc dán URL. */
function ImagePicker({
  slot,
  value,
  onChange,
  hint,
  preview,
}: {
  slot: "site_logo_image" | "site_favicon";
  value: string;
  onChange: (url: string) => void;
  hint: string;
  preview: "square" | "favicon";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    setError("");

    const body = new FormData();
    body.append("slot", slot);
    body.append("file", file);

    try {
      const res = await fetch("/api/admin/settings/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Tải lên thất bại.");
        return;
      }
      onChange(data.url);
    } catch {
      setError("Không kết nối được máy chủ.");
    } finally {
      setUploading(false);
      // Xoá giá trị input để chọn lại đúng file vừa rồi vẫn kích hoạt onChange
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const box = preview === "favicon" ? "h-10 w-10" : "h-16 w-16";

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
        className={`flex items-center gap-3 rounded-lg border border-dashed p-3 transition-colors ${
          dragging ? "border-accent bg-accent/5" : "border-border"
        }`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Xem trước"
            className={`${box} shrink-0 rounded-lg border border-border bg-surface-2 object-contain`}
          />
        ) : (
          <div
            className={`${box} flex shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-lg text-muted`}
          >
            🖼️
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? "Đang tải..." : value ? "Đổi ảnh" : "Chọn file"}
            </button>

            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                disabled={uploading}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-danger/40 hover:text-danger"
              >
                Xoá
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-muted">{hint}</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }}
        />
      </div>

      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="hoặc dán URL ảnh: https://..."
        className={`${INPUT_CLASS} text-xs`}
      />

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function BrandingCard({
  values,
  onChange,
  dirtyKeys,
}: {
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  dirtyKeys: string[];
}) {
  const mode = String(values.site_logo_mode ?? "text") as "text" | "image";
  const logoText = String(values.site_logo_text ?? "");
  const logoImage = String(values.site_logo_image ?? "");
  const favicon = String(values.site_favicon ?? "");

  const dirty = (key: string) => dirtyKeys.includes(key);

  return (
    <section className="rounded-xl border border-border bg-surface">
      <header className="border-b border-border/60 px-5 py-4">
        <h2 className="text-lg font-semibold text-foreground">🎨 Thương hiệu</h2>
        <p className="mt-0.5 text-xs text-muted">
          Logo đầu trang, chân trang và biểu tượng trên tab trình duyệt.
        </p>
      </header>

      <div className="divide-y divide-border/40">
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="sm:w-64 sm:shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Logo</span>
              {(dirty("site_logo_mode") || dirty("site_logo_text") || dirty("site_logo_image")) && (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                  Chưa lưu
                </span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Chọn hiển thị bằng chữ hoặc bằng ảnh. Đổi kiểu là xem trước đổi theo ngay.
            </p>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1">
              {(["text", "image"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onChange("site_logo_mode", m)}
                  aria-pressed={mode === m}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    mode === m
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted hover:bg-surface hover:text-foreground"
                  }`}
                >
                  {m === "text" ? "Chữ" : "Ảnh"}
                </button>
              ))}
            </div>

            {mode === "text" ? (
              <input
                type="text"
                value={logoText}
                onChange={(e) => onChange("site_logo_text", e.target.value)}
                placeholder="VD: nns"
                maxLength={20}
                className={`${INPUT_CLASS} max-w-56 ${dirty("site_logo_text") ? "border-accent" : ""}`}
              />
            ) : (
              <ImagePicker
                slot="site_logo_image"
                value={logoImage}
                onChange={(url) => onChange("site_logo_image", url)}
                hint="PNG, JPG, WEBP hoặc SVG, tối đa 2MB. Kéo thả file vào đây cũng được."
                preview="square"
              />
            )}

            <div className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2.5">
              <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">
                Xem trước
              </span>
              {mode === "image" && logoImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoImage}
                  alt=""
                  className="h-9 w-9 rounded-xl bg-surface object-contain"
                />
              ) : (
                <span className="pastel-flow pastel-glow flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-xs font-bold whitespace-nowrap text-pastel-ink">
                  {logoText || "?"}
                </span>
              )}
              {mode === "image" && !logoImage && (
                <span className="text-xs text-muted">
                  Chưa có ảnh — trang vẫn hiện logo chữ cho tới khi bạn tải ảnh lên.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="sm:w-64 sm:shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Favicon</span>
              {dirty("site_favicon") && (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                  Chưa lưu
                </span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Biểu tượng nhỏ hiện trên tab trình duyệt. Để trống thì dùng mặc định của trang.
            </p>
          </div>

          <div className="min-w-0 flex-1">
            <ImagePicker
              slot="site_favicon"
              value={favicon}
              onChange={(url) => onChange("site_favicon", url)}
              hint="Ảnh vuông 32–512px, PNG hoặc SVG."
              preview="favicon"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

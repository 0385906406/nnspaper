"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/admin/ui";

type ParentOption = { _id: string; name: string; icon: string; parentId?: string | null };

const CATEGORY_ICONS = [
  "🎌", "🎮", "🚀", "🌑", "🏞️", "🚗", "🕹️", "🧑", "🌿",
  "🌸", "⛩️", "🎨", "🖼️", "🎭", "🎬", "🌈", "🌺", "🔥",
];

export type CategoryFormValues = {
  _id?: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  order: number;
  /** "" = danh mục cấp trên cùng. */
  parent: string;
};

const EMPTY: CategoryFormValues = {
  name: "",
  slug: "",
  icon: "🎨",
  description: "",
  order: 0,
  parent: "",
};

const INPUT =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30 focus:outline-none";
const LABEL = "block text-xs font-semibold tracking-wide text-muted uppercase mb-1.5";

/** Bỏ dấu tiếng Việt trước khi tạo slug — "Phong cảnh" phải ra "phong-canh". */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function CategoryForm({ initial }: { initial?: CategoryFormValues }) {
  const router = useRouter();
  const isEdit = Boolean(initial?._id);

  const [values, setValues] = useState<CategoryFormValues>(initial ?? EMPTY);
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [parents, setParents] = useState<ParentOption[]>([]);

  useEffect(() => {
    fetch("/api/admin/categories?limit=100")
      .then((res) => (res.ok ? res.json() : { categories: [] }))
      .then((data: { categories?: ParentOption[] }) => {
        // Chỉ danh mục cấp trên cùng mới được làm cha, và không tự chọn chính mình
        setParents(
          (data.categories ?? []).filter((c) => !c.parentId && c._id !== initial?._id)
        );
      })
      .catch(() => setParents([]));
  }, [initial?._id]);

  function set<K extends keyof CategoryFormValues>(key: K, value: CategoryFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch(
        isEdit ? `/api/admin/categories/${initial!._id}` : "/api/admin/categories",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Lưu thất bại.");
        return;
      }

      router.push("/admin/categories");
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="name">
              Tên danh mục
            </label>
            <input
              id="name"
              value={values.name}
              onChange={(e) => {
                const name = e.target.value;
                setValues((v) => ({ ...v, name, slug: slugTouched ? v.slug : slugify(name) }));
                setError("");
              }}
              placeholder="Phong cảnh"
              className={INPUT}
              required
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="slug">
              Slug
            </label>
            <input
              id="slug"
              value={values.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value);
              }}
              placeholder="phong-canh"
              className={`${INPUT} font-mono text-xs`}
              required
            />
            <p className="mt-1 text-xs text-muted">/danh-muc/{values.slug || "…"}</p>
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="parent">
            Danh mục cha
          </label>
          <select
            id="parent"
            value={values.parent}
            onChange={(e) => set("parent", e.target.value)}
            className={`${INPUT} max-w-sm`}
          >
            <option value="">— Không có (danh mục gốc) —</option>
            {parents.map((p) => (
              <option key={p._id} value={p._id}>
                {p.icon} {p.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            Chọn cha để biến đây thành danh mục con, ví dụ “One Piece” → “Luffy”. Hình nền gắn vào
            danh mục con vẫn hiện khi khách xem danh mục cha. Hệ thống chỉ hỗ trợ hai cấp.
          </p>
        </div>

        <div>
          <label className={LABEL}>Biểu tượng</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => set("icon", icon)}
                aria-pressed={values.icon === icon}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-colors ${
                  values.icon === icon
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50"
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
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
            placeholder="Thiên nhiên, núi non, hoàng hôn, biển cả."
            className={INPUT}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="order">
            Thứ tự hiển thị
          </label>
          <input
            id="order"
            type="number"
            value={values.order}
            onChange={(e) => set("order", Number(e.target.value))}
            className={`${INPUT} max-w-32`}
          />
          <p className="mt-1 text-xs text-muted">Số nhỏ hơn hiện trước trên thanh chủ đề.</p>
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" isLoading={saving}>
          {isEdit ? "Lưu thay đổi" : "Tạo danh mục"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>
          Huỷ
        </Button>
      </div>
    </form>
  );
}

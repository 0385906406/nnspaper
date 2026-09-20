"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, CommaList } from "@/components/admin/ui";
import { BrandingCard } from "@/components/admin/branding-card";

interface Setting {
  key: string;
  value: unknown;
  type: "string" | "number" | "boolean" | "json" | "url" | "email";
  category: string;
  description: string;
  help: string;
  updatedAt: string | null;
}

const CATEGORY_META: Record<string, { label: string; icon: string; blurb: string }> = {
  site: {
    label: "Trang web",
    icon: "🌐",
    blurb: "Tên, mô tả và thông tin liên hệ hiển thị cho khách truy cập.",
  },
  display: {
    label: "Hiển thị",
    icon: "🎛️",
    blurb: "Cách nội dung được trình bày ở trang công khai.",
  },
  system: {
    label: "Hệ thống",
    icon: "⚙️",
    blurb: "Đóng/mở đăng ký và chế độ bảo trì toàn site.",
  },
};

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30 focus:outline-none";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 403 ? "Bạn không có quyền xem cài đặt." : "Không tải được cài đặt."
          );
        }
        return res.json();
      })
      .then((data) => setSettings(data.settings ?? []))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Chỉ gửi lên những mục thực sự khác giá trị đang lưu
  const changedKeys = useMemo(
    () =>
      Object.keys(draft).filter((key) => {
        const current = settings.find((s) => s.key === key);
        return current && JSON.stringify(current.value) !== JSON.stringify(draft[key]);
      }),
    [draft, settings]
  );

  function setValue(key: string, value: unknown) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setNotice("");
    setError("");
  }

  function valueOf(setting: Setting) {
    return draft[setting.key] ?? setting.value;
  }

  async function save() {
    if (changedKeys.length === 0) return;

    setSaving(true);
    setError("");
    setNotice("");

    const updates = Object.fromEntries(changedKeys.map((key) => [key, draft[key]]));

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Lưu thất bại.");
        return;
      }

      setSettings((prev) =>
        prev.map((s) => (s.key in updates ? { ...s, value: updates[s.key] } : s))
      );
      setDraft({});
      setNotice(data.message ?? "Đã lưu.");
    } catch {
      setError("Không kết nối được máy chủ.");
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setDraft({});
    setError("");
    setNotice("");
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Setting[]>();
    for (const s of settings) {
      const list = map.get(s.category) ?? [];
      list.push(s);
      map.set(s.category, list);
    }
    return [...map.entries()];
  }, [settings]);

  function renderInput(setting: Setting) {
    const value = valueOf(setting);
    const dirty = changedKeys.includes(setting.key);

    if (setting.type === "boolean") {
      const on = Boolean(value);
      return (
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => setValue(setting.key, !on)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            on ? "bg-accent" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
              on ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      );
    }

    if (setting.type === "number") {
      return (
        <input
          type="number"
          value={String(value)}
          onChange={(e) => setValue(setting.key, Number(e.target.value))}
          className={`${INPUT_CLASS} max-w-32 ${dirty ? "border-accent" : ""}`}
        />
      );
    }

    if (setting.type === "json") {
      // Mảng chuỗi nhập bằng dấu phẩy dễ hơn nhiều so với gõ JSON thô
      const list = Array.isArray(value) ? value : [];
      return (
        <CommaList
          multiline
          value={list}
          onChange={(next) => setValue(setting.key, next)}
          rows={3}
          placeholder="từ khoá 1, từ khoá 2, từ khoá 3"
          className={`${INPUT_CLASS} ${dirty ? "border-accent" : ""}`}
        />
      );
    }

    const long = setting.key === "site_description" || setting.key === "maintenance_message";
    if (long) {
      return (
        <textarea
          value={String(value)}
          onChange={(e) => setValue(setting.key, e.target.value)}
          rows={3}
          className={`${INPUT_CLASS} ${dirty ? "border-accent" : ""}`}
        />
      );
    }

    return (
      <input
        type={setting.type === "email" ? "email" : "text"}
        value={String(value)}
        onChange={(e) => setValue(setting.key, e.target.value)}
        className={`${INPUT_CLASS} ${dirty ? "border-accent" : ""}`}
      />
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold text-foreground">⚙️ Cài đặt hệ thống</h1>
        <p className="mt-1 text-muted">
          Thay đổi ở đây áp dụng ngay cho trang công khai.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}
      {notice && (
        <div className="rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-500">{notice}</div>
      )}

      {loading && <div className="text-muted">Đang tải...</div>}

      {grouped.map(([category, items]) => {
        // Nhóm thương hiệu có giao diện riêng: chọn kiểu logo + tải file, không
        // hợp với kiểu render "một ô nhập cho một khoá" như các nhóm còn lại.
        if (category === "branding") {
          return (
            <BrandingCard
              key={category}
              values={Object.fromEntries(items.map((s) => [s.key, valueOf(s)]))}
              onChange={setValue}
              dirtyKeys={changedKeys}
            />
          );
        }

        const meta = CATEGORY_META[category] ?? { label: category, icon: "📄", blurb: "" };
        return (
          <section key={category} className="rounded-xl border border-border bg-surface">
            <header className="border-b border-border/60 px-5 py-4">
              <h2 className="text-lg font-semibold text-foreground">
                {meta.icon} {meta.label}
              </h2>
              {meta.blurb && <p className="mt-0.5 text-xs text-muted">{meta.blurb}</p>}
            </header>

            <div className="divide-y divide-border/40">
              {items.map((setting) => {
                const dirty = changedKeys.includes(setting.key);
                return (
                  <div
                    key={setting.key}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:gap-6"
                  >
                    <div className="sm:w-64 sm:shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {setting.description}
                        </span>
                        {dirty && (
                          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                            Chưa lưu
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted">{setting.help}</p>
                      <code className="mt-1.5 inline-block text-[11px] text-muted/70">
                        {setting.key}
                      </code>
                    </div>

                    <div className="min-w-0 flex-1">{renderInput(setting)}</div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Thanh lưu bám đáy để không phải cuộn lên xuống tìm nút */}
      {changedKeys.length > 0 && (
        <div className="fixed right-6 bottom-6 left-6 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-surface p-4 shadow-lg lg:left-[calc(16rem+1.5rem)]">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{changedKeys.length}</span> thay đổi chưa lưu
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={discard} disabled={saving}>
              Huỷ
            </Button>
            <Button variant="primary" size="sm" onClick={save} isLoading={saving}>
              Lưu thay đổi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

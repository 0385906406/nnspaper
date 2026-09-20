"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mascot } from "page-mascot";
import { toast } from "@/lib/toast";
import {
  DEFAULT_MASCOT,
  MASCOTS,
  MASCOT_GROUPS,
  NO_MASCOT,
  mascotName,
  mascotSheets,
  type MascotGroup,
} from "@/lib/mascots";
import { CloseIcon } from "@/components/icons";
import { MascotAvatar } from "@/components/mascot-avatar";

/** Gọi API lưu lựa chọn rồi làm mới dữ liệu server để thanh bên đổi theo. */
export function useSaveMascot() {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);

  async function save(slug: string): Promise<boolean> {
    setSaving(slug);
    try {
      const res = await fetch("/api/me/mascot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mascot: slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Không lưu được nhân vật.");
        return false;
      }
      // mascotName chỉ biết bộ gốc; nhân vật tuỳ chỉnh rơi về "Nhân vật", chấp nhận được
      toast.success(slug === NO_MASCOT ? "Đã ẩn nhân vật" : `Đã chọn ${mascotName(slug)}`);
      router.refresh();
      return true;
    } catch {
      toast.error("Không kết nối được máy chủ.");
      return false;
    } finally {
      setSaving(null);
    }
  }

  return { save, saving };
}

/** Một nhân vật trong danh sách do /api/mascots trả về. */
type MascotEntry = {
  slug: string;
  name: string;
  group: MascotGroup;
  directions: string;
  reactions: string;
  custom: boolean;
};

/** Bộ gốc dùng ngay khi chưa tải xong, để lưới không nhấp nháy lúc mở trang. */
const BUILT_IN_ENTRIES: MascotEntry[] = MASCOTS.map((m) => ({
  ...m,
  ...mascotSheets(m.slug),
  custom: false,
}));

/** Lưới chọn nhân vật, chia tab theo nhóm, có xem trước bản động. */
export function MascotGrid({
  value,
  onPick,
  saving,
}: {
  value: string;
  onPick: (slug: string) => void;
  saving: string | null;
}) {
  const [entries, setEntries] = useState<MascotEntry[]>(BUILT_IN_ENTRIES);
  const initialGroup = BUILT_IN_ENTRIES.find((m) => m.slug === value)?.group ?? "animal";
  const [group, setGroup] = useState<MascotGroup>(initialGroup);
  const hidden = value === NO_MASCOT;

  // Nhân vật admin tự thêm nằm trong DB nên phải hỏi server; bộ gốc hiển thị
  // ngay từ đầu nên chờ một nhịp ở đây không làm lưới trống.
  useEffect(() => {
    fetch("/api/mascots")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data?.mascots) && data.mascots.length) setEntries(data.mascots);
      })
      .catch(() => {});
  }, []);

  const current = entries.find((m) => m.slug === value);
  const nameOf = (slug: string) => entries.find((m) => m.slug === slug)?.name ?? mascotName(slug);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-2xl bg-surface-2 p-3">
        {/* Khung tròn giống ảnh đại diện; bên trong là bản động (nhìn theo chuột, bấm để trêu) */}
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background ring-2 ring-pin/60">
          {hidden ? (
            <MascotAvatar mascot={DEFAULT_MASCOT} ring={false} className="h-20 w-20 opacity-50" />
          ) : (
            <Mascot
              key={value}
              directions={current?.directions ?? mascotSheets(value).directions}
              reactions={current?.reactions ?? mascotSheets(value).reactions}
              size={88}
              label={nameOf(value)}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {hidden ? "Đang ẩn ở thanh bên" : nameOf(value)}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {hidden
              ? `Ảnh đại diện tạm dùng ${mascotName(DEFAULT_MASCOT)}. Chọn một nhân vật bên dưới để hiện lại.`
              : "Đây cũng là ảnh đại diện của bạn. Rê chuột để nó nhìn theo, bấm vào để trêu nó."}
          </p>
        </div>
        {!hidden && (
          <button
            type="button"
            onClick={() => onPick(NO_MASCOT)}
            disabled={saving !== null}
            className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground disabled:opacity-50"
          >
            Ẩn nhân vật
          </button>
        )}
      </div>

      <div role="tablist" aria-label="Nhóm nhân vật" className="scrollbar-none flex gap-2 overflow-x-auto">
        {MASCOT_GROUPS.map((g) => (
          <button
            key={g.key}
            type="button"
            role="tab"
            aria-selected={group === g.key}
            onClick={() => setGroup(g.key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors ${
              group === g.key ? "bg-foreground text-background" : "bg-surface-2 text-foreground hover:bg-border"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <ul role="tabpanel" className="grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-4 md:grid-cols-5">
        {entries.filter((m) => m.group === group).map((m) => {
          const selected = m.slug === value;
          return (
            <li key={m.slug}>
              <button
                type="button"
                onClick={() => !selected && onPick(m.slug)}
                disabled={saving !== null}
                aria-pressed={selected}
                className="group flex w-full flex-col items-center gap-1.5 rounded-xl p-1 disabled:cursor-wait"
              >
                {/* Ô nhân vật tròn như ảnh đại diện; đang chọn thì có vòng đỏ */}
                <span
                  className={`relative rounded-full p-1 transition-all ${
                    selected
                      ? "bg-pin"
                      : "bg-transparent group-hover:bg-border group-focus-visible:bg-foreground/40"
                  }`}
                >
                  <MascotAvatar
                    mascot={m.slug}
                    ring={false}
                    className={`block h-16 w-16 transition-transform ${selected ? "" : "group-hover:scale-105"}`}
                  />
                  {saving === m.slug && (
                    <span className="absolute inset-1 flex items-center justify-center rounded-full bg-black/50">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    </span>
                  )}
                  {selected && (
                    <span className="absolute -right-0.5 -bottom-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-pin text-[11px] font-bold text-white">
                      ✓
                    </span>
                  )}
                </span>
                <span
                  className={`w-full truncate text-center text-xs ${
                    selected ? "font-bold text-foreground" : "font-medium text-muted group-hover:text-foreground"
                  }`}
                >
                  {m.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Hộp thoại chọn nhân vật, mở từ thanh điều hướng. */
export function MascotPickerDialog({ value, onClose }: { value: string; onClose: () => void }) {
  const { save, saving } = useSaveMascot();
  const [current, setCurrent] = useState(value);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function pick(slug: string) {
    if (await save(slug)) setCurrent(slug);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Chọn nhân vật">
      <button type="button" aria-label="Đóng" onClick={onClose} className="animate-fade-in absolute inset-0 bg-black/60" />
      <div className="animate-fade-in-up relative max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Chọn nhân vật của bạn</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-2"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <MascotGrid value={current} onPick={pick} saving={saving} />
      </div>
    </div>
  );
}

/** Mục chọn nhân vật đặt thẳng trong trang cá nhân. */
export function MascotSettings({ value }: { value: string }) {
  const { save, saving } = useSaveMascot();
  const [current, setCurrent] = useState(value);

  async function pick(slug: string) {
    if (await save(slug)) setCurrent(slug);
  }

  return <MascotGrid value={current} onPick={pick} saving={saving} />;
}

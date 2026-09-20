"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DotsIcon } from "@/components/icons";

/** Menu "…" ở hàng hành động: các thao tác phụ ít dùng. */
export function PinMoreMenu({ mediaUrl }: { mediaUrl: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-surface-2";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Tuỳ chọn khác"
        className="flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-2"
      >
        <DotsIcon className="h-6 w-6" />
      </button>

      {open && (
        <div
          role="menu"
          className="animate-scale-in absolute top-full left-0 z-30 mt-1 w-56 origin-top-left rounded-xl border border-border bg-surface p-1.5 shadow-2xl shadow-black/50"
        >
          <a href={mediaUrl} target="_blank" rel="noopener noreferrer" role="menuitem" className={item}>
            Mở ảnh gốc trong tab mới
          </a>
          <Link href="/lien-he" role="menuitem" className={`${item} text-danger`}>
            Báo cáo hình nền này
          </Link>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { toDownloadUrl } from "@/lib/format";
import { toast } from "@/lib/toast";
import { DownloadIcon } from "@/components/icons";

export function DownloadButton({ slug, filename }: { slug: string; filename: string }) {
  const [pending, setPending] = useState(false);

  async function handleDownload() {
    setPending(true);
    try {
      const res = await fetch(`/api/wallpapers/${slug}/download`, { method: "POST" });
      if (!res.ok) throw new Error("download failed");
      const data = (await res.json()) as { url: string };

      const link = document.createElement("a");
      link.href = toDownloadUrl(data.url);
      link.download = filename;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error("Không tải được, vui lòng thử lại.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={pending}
      aria-label="Tải xuống hình nền gốc"
      title="Tải xuống hình nền gốc"
      className="flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-2 disabled:opacity-50"
    >
      <DownloadIcon className={`h-6 w-6 ${pending ? "animate-pulse-soft" : ""}`} />
    </button>
  );
}

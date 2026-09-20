"use client";

import { toast } from "@/lib/toast";
import { ShareIcon } from "@/components/icons";

/** Chia sẻ qua hộp thoại hệ điều hành nếu có, không thì sao chép liên kết. */
export function ShareButton({ slug, title }: { slug: string; title: string }) {
  async function handleClick() {
    const url = `${window.location.origin}/hinh-nen/${slug}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // Người dùng huỷ hộp thoại chia sẻ — không cần báo lỗi
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Đã sao chép liên kết");
    } catch {
      toast.error("Trình duyệt chặn sao chép, hãy copy địa chỉ trên thanh URL.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Chia sẻ"
      title="Chia sẻ"
      className="flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-2"
    >
      <ShareIcon className="h-6 w-6" />
    </button>
  );
}

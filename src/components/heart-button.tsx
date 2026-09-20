"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCount } from "@/lib/format";
import { toast } from "@/lib/toast";
import { HeartIcon } from "@/components/icons";

type Props = {
  slug: string;
  initialLiked: boolean;
  initialLikes: number;
  loggedIn: boolean;
};

/** Nút thả tim: mỗi tài khoản tim một lần, bấm lại để bỏ tim. */
export function HeartButton({ slug, initialLiked, initialLikes, loggedIn }: Props) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!loggedIn) {
      router.push(`/dang-nhap?next=${encodeURIComponent(`/hinh-nen/${slug}`)}`);
      return;
    }
    if (pending) return;

    // Cập nhật lạc quan cho cảm giác bấm tức thì, lỗi thì trả lại như cũ
    const prev = { liked, likes };
    setLiked(!liked);
    setLikes((n) => Math.max(0, n + (liked ? -1 : 1)));
    setPending(true);
    try {
      const res = await fetch(`/api/wallpapers/${slug}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { liked: boolean; likes: number };
      setLiked(data.liked);
      setLikes(data.likes);
    } catch {
      setLiked(prev.liked);
      setLikes(prev.likes);
      toast.error("Không thả tim được, thử lại nhé.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={liked}
      aria-label={liked ? "Bỏ tim" : "Thả tim"}
      title={liked ? "Bỏ tim" : "Thả tim"}
      className="flex h-11 items-center gap-1.5 rounded-full px-3 text-foreground transition-colors hover:bg-surface-2"
    >
      <HeartIcon
        filled={liked}
        className={`h-6 w-6 transition-transform active:scale-90 ${liked ? "animate-pop text-pin" : ""}`}
      />
      <span className="text-sm font-semibold">{formatCount(likes)}</span>
    </button>
  );
}

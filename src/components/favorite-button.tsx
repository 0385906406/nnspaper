"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  slug: string;
  initialFavorited: boolean;
  loggedIn: boolean;
};

/** Nút "Lưu" đỏ kiểu Pinterest — thêm/bỏ hình nền khỏi danh sách yêu thích. */
export function FavoriteButton({ slug, initialFavorited, loggedIn }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!loggedIn) {
      router.push(`/dang-nhap?next=${encodeURIComponent(`/hinh-nen/${slug}`)}`);
      return;
    }

    const next = !favorited;
    setFavorited(next);
    startTransition(async () => {
      const res = await fetch(`/api/wallpapers/${slug}/favorite`, { method: "POST" });
      if (!res.ok) {
        setFavorited(!next);
        return;
      }
      const data = (await res.json()) as { favorited: boolean };
      setFavorited(data.favorited);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={favorited}
      title={favorited ? "Bỏ khỏi yêu thích" : "Lưu vào yêu thích"}
      className={`h-11 shrink-0 rounded-full px-5 text-sm font-bold transition-colors disabled:opacity-70 ${
        favorited
          ? "bg-foreground text-background hover:bg-foreground/85"
          : "bg-pin text-white hover:bg-pin-strong"
      }`}
    >
      {favorited ? "Đã lưu" : "Lưu"}
    </button>
  );
}

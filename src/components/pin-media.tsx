"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { WallpaperView } from "@/lib/wallpapers";
import { coverOf, videoSrc } from "@/lib/cover";
import { ArrowLeftIcon, CloseIcon, ExpandIcon } from "@/components/icons";

/** Ảnh/video chính của trang chi tiết: hiện nguyên tỉ lệ, có nút quay lại và xem toàn màn hình. */
export function PinMedia({ wallpaper, backHref }: { wallpaper: WallpaperView; backHref: string }) {
  const [zoomed, setZoomed] = useState(false);
  const { media } = wallpaper;
  const alt = media.alt || wallpaper.title;

  useEffect(() => {
    if (!zoomed) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setZoomed(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [zoomed]);

  const content =
    wallpaper.mediaType === "video" ? (
      <video
        className="max-h-[calc(100dvh-140px)] w-full object-contain"
        src={videoSrc(media.url)}
        poster={coverOf(wallpaper).url}
        autoPlay
        loop
        muted
        playsInline
        controls={zoomed}
      />
    ) : (
      <Image
        src={media.url}
        alt={alt}
        width={media.width || 1080}
        height={media.height || 1920}
        sizes="(min-width: 1280px) 30vw, (min-width: 768px) 50vw, 100vw"
        className="h-auto max-h-[calc(100dvh-140px)] w-full object-contain"
        priority
      />
    );

  return (
    <div className="relative flex h-full items-center justify-center bg-black/30">
      {content}

      <Link
        href={backHref}
        aria-label="Quay lại"
        className="absolute top-4 left-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-lg transition-colors hover:bg-surface-2"
      >
        <ArrowLeftIcon className="h-5 w-5" />
      </Link>

      <button
        type="button"
        onClick={() => setZoomed(true)}
        aria-label="Xem toàn màn hình"
        className="absolute right-4 bottom-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-lg transition-colors hover:bg-surface-2"
      >
        <ExpandIcon className="h-5 w-5" />
      </button>

      {zoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setZoomed(false)}
          className="animate-fade-in fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4"
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Đóng"
            className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
          {wallpaper.mediaType === "video" ? (
            <video src={videoSrc(media.url)} className="max-h-full max-w-full" autoPlay loop controls playsInline />
          ) : (
            // Ảnh gốc Cloudinary có thể không nằm trong danh sách kích thước của next/image
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.url} alt={alt} className="max-h-full max-w-full object-contain" />
          )}
        </div>
      )}
    </div>
  );
}

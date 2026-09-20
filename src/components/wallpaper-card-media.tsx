"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { videoSrc } from "@/lib/cover";

type Props = {
  imageUrl: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** Có giá trị khi là hình nền động — video sẽ phát thử khi rê chuột vào card. */
  previewVideoUrl?: string;
};

export function WallpaperCardMedia({ imageUrl, alt, sizes, priority, previewVideoUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovering, setHovering] = useState(false);

  function handleEnter() {
    if (!previewVideoUrl) return;
    setHovering(true);
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
    }
  }

  function handleLeave() {
    if (!previewVideoUrl) return;
    setHovering(false);
    videoRef.current?.pause();
  }

  return (
    <div className="absolute inset-0" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <Image
        src={imageUrl}
        alt={alt}
        fill
        sizes={sizes}
        className={`object-cover transition-opacity duration-300 group-hover:scale-105 ${
          hovering ? "opacity-0" : "opacity-100"
        }`}
        priority={priority}
      />
      {previewVideoUrl ? (
        <video
          ref={videoRef}
          src={videoSrc(previewVideoUrl)}
          poster={imageUrl}
          muted
          loop
          playsInline
          preload="none"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            hovering ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : null}
    </div>
  );
}

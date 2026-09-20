"use client";

import { useEffect, useRef, useState } from "react";
import { avatarMascot, mascotName, mascotSheets } from "@/lib/mascots";

/*
 * Theo dõi con trỏ dùng chung cho mọi avatar trên trang: một listener duy nhất,
 * gom cập nhật theo requestAnimationFrame. Nhờ vậy trang có vài chục avatar
 * (danh sách bình luận, bộ chọn nhân vật) vẫn nhẹ.
 */
type Pointer = { x: number; y: number };
const subscribers = new Set<(pointer: Pointer) => void>();
let lastPointer: Pointer | null = null;
let frame = 0;

function flush() {
  frame = 0;
  if (lastPointer) subscribers.forEach((fn) => fn(lastPointer!));
}

function schedule() {
  if (!frame) frame = window.requestAnimationFrame(flush);
}

function onPointerMove(e: PointerEvent) {
  lastPointer = { x: e.clientX, y: e.clientY };
  schedule();
}

function subscribe(fn: (pointer: Pointer) => void): () => void {
  if (subscribers.size === 0) {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    // Cuộn trang làm avatar đổi vị trí dù chuột đứng yên
    window.addEventListener("scroll", schedule, { passive: true });
  }
  subscribers.add(fn);
  if (lastPointer) fn(lastPointer);
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0) {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", schedule);
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}

/*
 * 9 hướng nhìn trong sheet (3×3, cùng thứ tự với gói page-mascot):
 *   0 trên-trái  1 trên   2 trên-phải
 *   3 trái       4 giữa   5 phải
 *   6 dưới-trái  7 dưới   8 dưới-phải
 * Góc tính theo atan2 với trục y hướng xuống, bắt đầu từ bên phải, theo chiều kim đồng hồ.
 */
const CENTER = 4;
const CLOCKWISE = [5, 8, 7, 6, 3, 0, 1, 2];
const SECTOR = (Math.PI * 2) / CLOCKWISE.length;
const HYSTERESIS = 0.12;

function wrap(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

// Sheet phóng 360%: mỗi ô rộng 1,2 lần avatar, thừa 0,1 mỗi bên. Dịch lên 0,26 để
// khuôn mặt (nằm ở nửa trên mỗi ô) vào giữa vòng tròn.
const ZOOM = 3.6;
const CELL = ZOOM / 3;
const FACE_LIFT = 0.26;

function cellPosition(index: number): string {
  const col = index % 3;
  const row = Math.floor(index / 3);
  const span = ZOOM - 1;
  const x = ((col * CELL + (CELL - 1) / 2) / span) * 100;
  const y = ((row * CELL + (CELL - 1) / 2 - FACE_LIFT) / span) * 100;
  return `${x}% ${y}%`;
}

/**
 * Ảnh đại diện của người dùng = khuôn mặt nhân vật họ chọn, quay theo con trỏ chuột
 * (giống linh vật ở thanh bên). Không có ảnh tải lên — mọi nơi hiển thị avatar đều
 * dùng component này.
 */
export function MascotAvatar({
  mascot,
  className = "h-8 w-8",
  ring = true,
  label,
  track = true,
}: {
  /** Slug nhân vật; "none"/không hợp lệ sẽ dùng nhân vật mặc định. */
  mascot?: string | null;
  /** Kích thước (h-*, w-*) và class thêm. */
  className?: string;
  ring?: boolean;
  /** Có thì avatar được đọc lên cho trình đọc màn hình. */
  label?: string;
  /** Quay mặt theo con trỏ chuột (mặc định bật). */
  track?: boolean;
}) {
  const slug = avatarMascot(mascot);
  const ref = useRef<HTMLSpanElement>(null);
  const [direction, setDirection] = useState(CENTER);

  useEffect(() => {
    // Màn hình cảm ứng không có con trỏ để nhìn theo
    if (!track || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let sector = -1;
    return subscribe(({ x, y }) => {
      const el = ref.current;
      if (!el) return;
      const box = el.getBoundingClientRect();
      // Avatar nằm ngoài màn hình thì khỏi tính
      if (box.bottom < 0 || box.top > window.innerHeight || box.width === 0) return;

      const dx = x - (box.left + box.width / 2);
      const dy = y - (box.top + box.height / 2);
      // Chuột ở ngay trên avatar thì nhìn thẳng
      if (Math.hypot(dx, dy) < Math.max(14, box.width * 0.6)) {
        sector = -1;
        setDirection(CENTER);
        return;
      }

      // Giữ hướng hiện tại cho tới khi chuột đi hẳn qua ranh giới, tránh giật qua lại
      const angle = Math.atan2(dy, dx);
      if (sector !== -1 && Math.abs(wrap(angle - sector * SECTOR)) < SECTOR / 2 + HYSTERESIS) return;
      sector = (Math.round(angle / SECTOR) + CLOCKWISE.length) % CLOCKWISE.length;
      setDirection(CLOCKWISE[sector]);
    });
  }, [track]);

  return (
    <span
      ref={ref}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      title={label ? undefined : mascotName(slug)}
      className={`relative inline-block shrink-0 overflow-hidden rounded-full bg-surface-2 ${
        ring ? "ring-1 ring-border" : ""
      } ${className}`}
    >
      <span
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${mascotSheets(slug).directions})`,
          backgroundSize: `${ZOOM * 100}% ${ZOOM * 100}%`,
          backgroundPosition: cellPosition(direction),
          backgroundRepeat: "no-repeat",
        }}
      />
    </span>
  );
}

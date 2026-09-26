"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/** Màu gạch LEGO cổ điển; mỗi lần phóng lên xong, viên gạch quay lại với màu kế tiếp. */
const BRICKS = [
  { lego: "#e3000b", dark: "#9c0008", light: "#ff5a5f", ink: "#fff" },
  { lego: "#ffcd03", dark: "#c28f00", light: "#ffe66b", ink: "#6b4d00" },
  { lego: "#0a74d6", dark: "#054a8c", light: "#5aa9f0", ink: "#fff" },
  { lego: "#00a650", dark: "#006e35", light: "#4fd68e", ink: "#fff" },
];

/** Mảnh 1×1 bắn ra lúc phóng: hướng bay và góc xoay. */
const BITS = [
  { dx: "-30px", dy: "10px", rot: "-160deg" },
  { dx: "-16px", dy: "20px", rot: "120deg" },
  { dx: "16px", dy: "20px", rot: "-110deg" },
  { dx: "30px", dy: "8px", rot: "170deg" },
];

const SHOW_AFTER = 600;
const LAUNCH_MS = 700;

type Phase = "hidden" | "drop" | "launch";

/**
 * Nút lên đầu trang hình viên gạch LEGO (CSS ở mục .lego-* trong globals.css).
 * Mặt gạch đầy dần theo tiến độ cuộn. Bấm vào thì gạch nhún rồi phóng vút lên
 * cùng lúc trang cuộn về đầu.
 */
export function BackToTop() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  const [launching, setLaunching] = useState(false);
  // Sau khi phóng, chờ trang cuộn xong mới cho gạch rơi lại — không thì nó rơi
  // xuống ngay giữa lúc trang đang cuộn về đầu.
  const [cooldown, setCooldown] = useState(false);
  const [color, setColor] = useState(0);

  useEffect(() => {
    let frame = 0;
    let settle: ReturnType<typeof setTimeout> | undefined;

    function update() {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      setVisible(y > SHOW_AFTER);
      buttonRef.current?.style.setProperty("--progress", String(max > 0 ? Math.min(1, y / max) : 0));
      if (y <= SHOW_AFTER) setCooldown(false);
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
      // Người dùng cuộn ngược lại giữa chừng: dừng tay thì gạch được quay lại
      clearTimeout(settle);
      settle = setTimeout(() => setCooldown(false), 300);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, []);

  useEffect(() => {
    if (!launching) return;
    const timer = setTimeout(() => {
      setLaunching(false);
      setColor((c) => (c + 1) % BRICKS.length);
    }, LAUNCH_MS);
    return () => clearTimeout(timer);
  }, [launching]);

  function launch() {
    if (launching) return;
    setLaunching(true);
    setCooldown(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const phase: Phase = launching ? "launch" : visible && !cooldown ? "drop" : "hidden";
  const show = phase !== "hidden";
  const brick = BRICKS[color];

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={launch}
      aria-label="Lên đầu trang"
      tabIndex={show ? 0 : -1}
      data-show={show}
      data-phase={phase}
      style={
        {
          "--lego": brick.lego,
          "--lego-dark": brick.dark,
          "--lego-light": brick.light,
          "--lego-ink": brick.ink,
        } as CSSProperties
      }
      // Mobile đẩy lên trên thanh tab dưới đáy
      className="lego-btn fixed right-4 bottom-28 z-30 lg:right-6 lg:bottom-10"
    >
      <span className="lego-ground" aria-hidden="true" />
      <span className="lego-snap" aria-hidden="true" />
      {BITS.map((bit, i) => (
        <span
          key={i}
          className="lego-bit"
          aria-hidden="true"
          style={{ "--dx": bit.dx, "--dy": bit.dy, "--rot": bit.rot } as CSSProperties}
        />
      ))}

      <span className="lego-brick" aria-hidden="true">
        <span className="lego-face">
          <span className="lego-studs">
            <i />
            <i />
          </span>
          <span className="lego-glass">
            <span className="lego-fill" />
          </span>
          <svg
            viewBox="0 0 24 24"
            className="lego-arrow"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </span>
      </span>
    </button>
  );
}

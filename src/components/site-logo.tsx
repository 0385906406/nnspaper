/**
 * Ô logo cạnh tên trang. Có ảnh thì dùng ảnh, không thì hiện chữ nguyên văn.
 *
 * Dùng <img> thường chứ không phải next/image vì URL do admin nhập tuỳ ý, mà
 * next/image chỉ nhận host đã khai trong next.config.ts.
 */
export function SiteLogo({
  mode,
  text,
  image,
  siteName,
  size = "md",
  interactive,
}: {
  mode: "text" | "image";
  text: string;
  image: string;
  siteName: string;
  size?: "sm" | "md";
  interactive?: boolean;
}) {
  const hover = interactive
    ? "transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105"
    : "";

  if (mode === "image" && image) {
    const box = size === "sm" ? "h-7 w-7 rounded-lg" : "h-9 w-9 rounded-xl";
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={siteName}
        className={`${box} shrink-0 bg-surface-2 object-contain ${hover}`}
      />
    );
  }

  // min-w thay vì w cố định: chữ dài hơn 2 ký tự sẽ tràn ra ngoài ô nếu khoá cứng
  // chiều rộng, nên để ô tự giãn theo nội dung.
  const box =
    size === "sm"
      ? "h-7 min-w-7 rounded-lg px-1.5 text-[10px]"
      : "h-9 min-w-9 rounded-xl px-2 text-xs";

  return (
    <span
      className={`pastel-flow pastel-glow ${box} flex shrink-0 items-center justify-center font-bold whitespace-nowrap text-pastel-ink normal-case ${
        size === "md" ? "shadow-lg shadow-black/20" : ""
      } ${hover}`}
    >
      {text}
    </span>
  );
}

"use client";

import { useState, type KeyboardEvent } from "react";

/**
 * Ô nhập danh sách thẻ: gõ xong nhấn dấu phẩy hoặc Enter thì chữ vừa gõ tách ra
 * thành một thẻ riêng nằm bên dưới, kèm nút xoá.
 *
 * Trước đây đây là một input thường chứa cả chuỗi "a, b, c". Cách đó vừa khó đọc
 * khi nhiều thẻ, vừa không sửa lẻ được thẻ ở giữa, và nhất là không gõ nổi dấu
 * phẩy: chuỗi hiển thị vốn sinh ra từ chính mảng thẻ, nên dấu phẩy vừa gõ đã bị
 * vòng tách/ghép ăn mất ngay.
 */
export function TagsInput({
  value,
  onChange,
  max,
  placeholder,
  className,
  id,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  /** Bỏ trống là không giới hạn. Thẻ hình nền đặt 20 cho khớp mức server cắt. */
  max?: number;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const [draft, setDraft] = useState("");
  const full = max !== undefined && value.length >= max;

  /** Nhận cả chuỗi dán vào có sẵn nhiều dấu phẩy, tách thành nhiều thẻ một lượt. */
  function add(raw: string) {
    const next = [...value];
    for (const part of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
      if (max !== undefined && next.length >= max) break;
      // So không phân biệt hoa thường để "Anime" và "anime" không thành hai thẻ
      if (!next.some((t) => t.toLowerCase() === part.toLowerCase())) next.push(part);
    }
    if (next.length !== value.length) onChange(next);
  }

  function commit() {
    add(draft);
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "," || e.key === "Enter") {
      // Enter trong form sẽ gửi form, phải chặn trước khi nó kịp nổi lên
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div>
      <input
        id={id}
        value={draft}
        disabled={full}
        onChange={(e) => {
          // Dán một chuỗi có dấu phẩy thì tách ngay, không đợi nhấn phím
          if (e.target.value.includes(",")) {
            add(e.target.value);
            setDraft("");
          } else {
            setDraft(e.target.value);
          }
        }}
        onKeyDown={handleKeyDown}
        // Rời ô mà còn chữ dở thì vẫn giữ lại, không để người dùng mất công gõ
        onBlur={commit}
        placeholder={full ? `Đã đủ ${max} thẻ` : placeholder}
        className={className}
      />

      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 py-1 pr-1 pl-2.5 text-xs text-foreground"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((t) => t !== tag))}
                aria-label={`Xoá thẻ ${tag}`}
                className="flex h-4 w-4 items-center justify-center rounded-full text-muted transition-colors hover:bg-border hover:text-foreground"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="mt-1.5 text-xs text-muted">
        Nhấn dấu phẩy hoặc Enter để tách thẻ · Backspace khi ô trống để xoá thẻ cuối
        {max !== undefined && ` · ${value.length}/${max}`}
      </p>
    </div>
  );
}

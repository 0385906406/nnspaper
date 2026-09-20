"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ô nhập một danh sách chuỗi, ngăn cách bằng dấu phẩy.
 *
 * Không thể nối thẳng `value.join(", ")` vào một input điều khiển rồi `split(",")`
 * trong onChange: gõ dấu phẩy sẽ sinh ra phần tử rỗng, `filter(Boolean)` loại nó
 * đi, mảng dội ngược lại thành chuỗi không còn dấu phẩy — nên dấu phẩy biến mất
 * ngay khi vừa gõ và không bao giờ nhập được thẻ thứ hai. Khoảng trắng sau dấu
 * phẩy cũng bị `trim()` ăn mất theo cách y hệt.
 *
 * Vì vậy phần chữ đang gõ được giữ nguyên trong state riêng; mảng chỉ là kết quả
 * suy ra để gửi đi. Rời ô thì chuẩn hoá lại phần chữ cho khớp mảng.
 */
export function CommaList({
  value,
  onChange,
  multiline = false,
  ...props
}: {
  value: string[];
  onChange: (next: string[]) => void;
  multiline?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement> & React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  const [text, setText] = useState(() => value.join(", "));
  const focused = useRef(false);

  // Giá trị đổi từ bên ngoài (nạp bản ghi, reset form) thì đồng bộ lại phần chữ,
  // nhưng không đụng vào khi người dùng đang gõ dở.
  useEffect(() => {
    if (!focused.current) setText(value.join(", "));
  }, [value]);

  function handle(raw: string) {
    setText(raw);
    onChange([...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))]);
  }

  const shared = {
    value: text,
    onFocus: () => {
      focused.current = true;
    },
    onBlur: () => {
      focused.current = false;
      setText(value.join(", "));
    },
  };

  return multiline ? (
    <textarea {...props} {...shared} onChange={(e) => handle(e.target.value)} />
  ) : (
    <input {...props} {...shared} onChange={(e) => handle(e.target.value)} />
  );
}

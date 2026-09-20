"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { CommentView } from "@/lib/comments";
import { formatRelative } from "@/lib/format";
import { toast } from "@/lib/toast";
import { CommentIcon, SendIcon, SmileIcon, TrashIcon } from "@/components/icons";
import { MascotAvatar } from "@/components/mascot-avatar";

const MAX_LENGTH = 500;
const QUICK_EMOJIS = ["😍", "🔥", "👍", "😂", "🥰", "😮", "💯", "✨"];

type CurrentUser = { id: string; name: string; mascot: string };

type Props = {
  slug: string;
  initialComments: CommentView[];
  initialTotal: number;
  /** false = admin đã tắt nhận xét (cho ảnh này hoặc toàn trang). */
  enabled: boolean;
  currentUser: CurrentUser | null;
  canModerate: boolean;
  /** Phần thông tin hình nền, cuộn chung với danh sách bình luận. */
  children: ReactNode;
};

/** Cột phải của khung chi tiết: thông tin + danh sách nhận xét cuộn được, ô nhập cố định ở đáy. */
export function CommentsSection({
  slug,
  initialComments,
  initialTotal,
  enabled,
  currentUser,
  canModerate,
  children,
}: Props) {
  const [comments, setComments] = useState(initialComments);
  const [total, setTotal] = useState(initialTotal);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLElement>(null);

  const trimmed = content.trim();

  async function submit() {
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/wallpapers/${slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Không gửi được bình luận.");
        return;
      }
      setComments((list) => [data.comment as CommentView, ...list]);
      setTotal((n) => n + 1);
      setContent("");
      setShowEmojis(false);
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      toast.error("Không kết nối được máy chủ.");
    } finally {
      setSending(false);
    }
  }

  async function remove(comment: CommentView) {
    if (!confirm("Xoá bình luận này?")) return;
    const res = await fetch(`/api/comments/${comment.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Xoá thất bại.");
      return;
    }
    setComments((list) => list.filter((c) => c.id !== comment.id));
    setTotal((n) => Math.max(0, n - 1));
    toast.success("Đã xoá bình luận");
  }

  function addEmoji(emoji: string) {
    setContent((v) => (v + emoji).slice(0, MAX_LENGTH));
    inputRef.current?.focus();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 sm:px-6">
        {children}

        <section id="nhan-xet" ref={listRef} className="scroll-mt-4 border-t border-border pt-4">
          <h2 className="mb-3 text-base font-bold text-foreground">
            {total > 0 ? `${total} nhận xét` : "Nhận xét"}
          </h2>

          {comments.length === 0 ? (
            <p className="text-sm text-muted">
              {enabled
                ? "Chưa có nhận xét nào! Hãy thêm nhận xét để bắt đầu cuộc trò chuyện."
                : "Đã tắt nhận xét cho hình nền này."}
            </p>
          ) : (
            <ul className="space-y-4">
              {comments.map((c) => {
                const canDelete = currentUser?.id === c.userId || canModerate;
                return (
                  <li key={c.id} className="group flex gap-2.5">
                    <MascotAvatar mascot={c.userMascot} className="h-9 w-9" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug break-words text-foreground">
                        <span className="mr-1.5 font-bold">{c.userName}</span>
                        {c.content}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                        <time dateTime={c.createdAt} suppressHydrationWarning>
                          {formatRelative(c.createdAt)}
                        </time>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => remove(c)}
                            className="flex items-center gap-1 opacity-100 transition-opacity hover:text-danger sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                            Xoá
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {enabled && comments.length > 0 && total > comments.length && (
            <p className="mt-4 text-xs text-muted">Đang hiện {comments.length} nhận xét mới nhất.</p>
          )}
        </section>
      </div>

      <div className="border-t border-border px-4 py-3 sm:px-5">
        {!enabled ? (
          <p className="py-2 text-center text-sm text-muted">Đã tắt nhận xét cho hình nền này</p>
        ) : !currentUser ? (
          <Link
            href={`/dang-nhap?next=${encodeURIComponent(`/hinh-nen/${slug}`)}`}
            className="flex h-12 items-center rounded-full border border-border px-5 text-sm text-muted transition-colors hover:border-foreground/40 hover:text-foreground"
          >
            Đăng nhập để thêm nhận xét...
          </Link>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="relative"
          >
            {showEmojis && (
              <div className="animate-scale-in absolute right-0 bottom-full mb-2 flex gap-1 rounded-2xl border border-border bg-surface p-2 shadow-2xl">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => addEmoji(emoji)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-surface-2"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <MascotAvatar mascot={currentUser.mascot} className="h-10 w-10" label={`Nhân vật của ${currentUser.name}`} />
              <div className="flex min-h-12 min-w-0 flex-1 items-end gap-1 rounded-3xl border border-border bg-background py-1.5 pr-1.5 pl-4 focus-within:border-foreground/40">
                <label htmlFor="comment-input" className="sr-only">
                  Thêm nhận xét
                </label>
                <textarea
                  id="comment-input"
                  ref={inputRef}
                  rows={1}
                  value={content}
                  maxLength={MAX_LENGTH}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder="Thêm nhận xét để bắt đầu cuộc trò chuyện..."
                  className="field-sizing-content max-h-32 min-w-0 flex-1 resize-none self-center bg-transparent py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowEmojis((v) => !v)}
                  aria-label="Chèn biểu tượng cảm xúc"
                  aria-expanded={showEmojis}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-surface-2"
                >
                  <SmileIcon className="h-5 w-5" />
                </button>
                {trimmed && (
                  <button
                    type="submit"
                    disabled={sending}
                    aria-label="Gửi nhận xét"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pin text-white transition-colors hover:bg-pin-strong disabled:opacity-60"
                  >
                    <SendIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {content.length > MAX_LENGTH - 50 && (
              <p className="mt-1 text-right text-[11px] text-muted">
                {content.length}/{MAX_LENGTH}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

/** Nút bong bóng ở hàng hành động: đưa con trỏ vào ô nhận xét. */
export function CommentJumpButton({ count }: { count: number }) {
  return (
    <button
      type="button"
      onClick={() => {
        const input = document.getElementById("comment-input");
        if (input) input.focus();
        else document.getElementById("nhan-xet")?.scrollIntoView({ behavior: "smooth" });
      }}
      aria-label={`Nhận xét (${count})`}
      title="Nhận xét"
      className="flex h-11 items-center gap-1.5 rounded-full px-3 text-foreground transition-colors hover:bg-surface-2"
    >
      <CommentIcon className="h-6 w-6" />
      {count > 0 && <span className="text-sm font-semibold">{count}</span>}
    </button>
  );
}

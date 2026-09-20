"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { SuggestResponse } from "@/app/api/search/suggest/route";
import { matchRanges } from "@/lib/search-text";
import { ArrowLeftIcon, CloseIcon, FlameIcon, PlayIcon, SearchIcon } from "@/components/icons";

const RECENT_KEY = "recent-searches";
const RECENT_MAX = 8;
const DEBOUNCE_MS = 180;

type Option =
  | { kind: "search" | "recent" | "trend" | "tag"; label: string }
  | { kind: "category"; label: string; slug: string; icon: string }
  | { kind: "wallpaper"; label: string; slug: string; image: string; mediaType: "image" | "video" };

function readRecent(): string[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function writeRecent(list: string[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // localStorage bị chặn — bỏ qua, lịch sử chỉ là tiện ích
  }
}

/** Tô đậm phần khớp từ khoá (không phân biệt dấu). */
function Highlight({ text, query }: { text: string; query: string }) {
  const chars = Array.from(text);
  const ranges = matchRanges(text, query);
  if (!ranges.length) return <>{text}</>;
  const parts: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([s, e], i) => {
    if (s > cursor) parts.push(chars.slice(cursor, s).join(""));
    parts.push(
      <mark key={i} className="bg-transparent font-bold text-foreground">
        {chars.slice(s, e).join("")}
      </mark>
    );
    cursor = e;
  });
  if (cursor < chars.length) parts.push(chars.slice(cursor).join(""));
  return <>{parts}</>;
}

function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-2 pt-3 pb-2">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{children}</p>
      {action}
    </div>
  );
}

/**
 * Ô tìm kiếm ở header kiểu Pinterest: gợi ý tức thì, lịch sử, thịnh hành, phím tắt.
 * Không có JS thì vẫn là một form GET bình thường tới /?q=.
 */
export function SearchBox({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cacheRef = useRef(new Map<string, SuggestResponse>());

  const [value, setValue] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SuggestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);

  // Đổi trang tìm kiếm (vd. bấm thẻ tag) thì ô hiển thị theo từ khoá mới
  const [syncedQuery, setSyncedQuery] = useState(initialQuery);
  if (syncedQuery !== initialQuery) {
    setSyncedQuery(initialQuery);
    setValue(initialQuery);
  }

  const query = value.trim();

  // Lấy gợi ý (có debounce + huỷ request cũ + cache theo từ khoá)
  useEffect(() => {
    if (!open) return;
    const key = query.toLowerCase();
    const cached = cacheRef.current.get(key);
    const controller = new AbortController();
    const timer = window.setTimeout(
      async () => {
        if (cached) {
          setData(cached);
          return;
        }
        setLoading(true);
        try {
          const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`, { signal: controller.signal });
          if (!res.ok) return;
          const json = (await res.json()) as SuggestResponse;
          cacheRef.current.set(key, json);
          setData(json);
        } catch {
          // Bị huỷ vì người dùng gõ tiếp, hoặc mất mạng — giữ gợi ý cũ
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      cached ? 0 : DEBOUNCE_MS
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  // Bấm ra ngoài thì đóng
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Mobile mở toàn màn hình: khoá cuộn trang phía sau
  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 639px)").matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Phím tắt: "/" hoặc Ctrl/⌘ + K để nhảy vào ô tìm kiếm
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      const isSlash = e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey;
      const isCmdK = e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey);
      if (!isSlash && !isCmdK) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Gợi ý đang hiển thị có thể là của từ khoá cũ (đang chờ debounce) — chỉ dùng khi khớp
  const shown = data && data.query.toLowerCase() === query.toLowerCase() ? data : null;

  const options = useMemo<Option[]>(() => {
    if (query) {
      const list: Option[] = [{ kind: "search", label: query }];
      shown?.tags.forEach((t) => list.push({ kind: "tag", label: t }));
      shown?.categories.forEach((c) => list.push({ kind: "category", label: c.name, slug: c.slug, icon: c.icon }));
      shown?.wallpapers.forEach((w) =>
        list.push({ kind: "wallpaper", label: w.title, slug: w.slug, image: w.image, mediaType: w.mediaType })
      );
      return list;
    }
    const list: Option[] = recent.map((r) => ({ kind: "recent", label: r }));
    shown?.trending?.forEach((t) => list.push({ kind: "trend", label: t }));
    shown?.categories.forEach((c) => list.push({ kind: "category", label: c.name, slug: c.slug, icon: c.icon }));
    return list;
  }, [query, shown, recent]);

  function openPanel() {
    setRecent(readRecent());
    setActive(-1);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
  }

  function search(term: string) {
    const q = term.trim();
    if (!q) return;
    const next = [q, ...readRecent().filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, RECENT_MAX);
    writeRecent(next);
    setRecent(next);
    setValue(q);
    close();
    router.push(`/?q=${encodeURIComponent(q)}`);
  }

  function choose(option: Option) {
    if (option.kind === "category") {
      close();
      router.push(`/danh-muc/${option.slug}`);
    } else if (option.kind === "wallpaper") {
      close();
      router.push(`/hinh-nen/${option.slug}`);
    } else {
      search(option.label);
    }
  }

  function removeRecent(term: string) {
    const next = recent.filter((r) => r !== term);
    writeRecent(next);
    setRecent(next);
    setActive(-1);
    inputRef.current?.focus();
  }

  function clearRecent() {
    writeRecent([]);
    setRecent([]);
    setActive(-1);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openPanel();
      if (!options.length) return;
      // -1 là "đang ở ô nhập": xuống cuối danh sách thì quay về ô nhập và ngược lại
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => {
        const next = i + step;
        if (next < -1) return options.length - 1;
        if (next >= options.length) return -1;
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && active >= 0 && active < options.length) choose(options[active]);
      else search(value);
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        close();
      }
    }
  }

  const optionId = (i: number) => `${listId}-opt-${i}`;
  // Chỉ gắn thuộc tính; click/hover xử lý chung ở listbox qua data-opt
  const optionProps = (i: number) => ({
    id: optionId(i),
    role: "option" as const,
    "aria-selected": active === i,
    "data-opt": i,
  });

  function optionIndex(e: React.SyntheticEvent): number {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-opt]");
    return el ? Number(el.dataset.opt) : -1;
  }
  const rowClass = (i: number) =>
    `flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors ${
      active === i ? "bg-surface-2" : ""
    }`;

  // Chỉ số bắt đầu của từng nhóm trong danh sách phẳng `options`
  const indexOf = (predicate: (o: Option) => boolean) => options.findIndex(predicate);

  return (
    <div
      ref={rootRef}
      className={`min-w-0 flex-1 ${
        open
          ? "max-sm:fixed max-sm:inset-0 max-sm:z-50 max-sm:flex max-sm:flex-col max-sm:bg-background max-sm:p-3"
          : ""
      } sm:relative`}
    >
      <form
        action="/"
        method="GET"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          search(value);
        }}
        className="flex items-center gap-2"
      >
        {open && (
          <button
            type="button"
            onClick={close}
            aria-label="Đóng tìm kiếm"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-2 sm:hidden"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
        )}
        <label htmlFor="site-search" className="sr-only">
          Tìm kiếm hình nền
        </label>
        <div
          className={`flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-2xl bg-surface-2 px-4 transition-shadow sm:h-12 ${
            open ? "ring-2 ring-foreground/25" : "hover:bg-border/70"
          }`}
        >
          <SearchIcon className="h-5 w-5 shrink-0 text-muted" />
          <input
            ref={inputRef}
            id="site-search"
            type="search"
            name="q"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setActive(-1);
              if (!open) openPanel();
            }}
            onFocus={() => !open && openPanel()}
            onKeyDown={onKeyDown}
            placeholder="Tìm kiếm hình nền, video nền..."
            autoComplete="off"
            enterKeyHint="search"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
            className="w-full min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none sm:text-base [&::-webkit-search-cancel-button]:hidden"
          />
          {loading && (
            <span
              className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-border border-t-foreground"
              aria-hidden="true"
            />
          )}
          {value && (
            <button
              type="button"
              onClick={() => {
                setValue("");
                setActive(-1);
                inputRef.current?.focus();
              }}
              aria-label="Xoá từ khoá"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-border hover:text-foreground"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          )}
          {!open && !value && (
            <kbd
              className="hidden shrink-0 rounded-md border border-border px-1.5 py-0.5 font-sans text-[11px] text-muted lg:block"
              title="Nhấn / hoặc Ctrl + K để tìm kiếm"
            >
              /
            </kbd>
          )}
        </div>
      </form>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label="Gợi ý tìm kiếm"
          // mousedown giữ focus ở ô nhập để panel không đóng trước khi click chạy
          onMouseDown={(e) => e.preventDefault()}
          onMouseOver={(e) => {
            const i = optionIndex(e);
            if (i >= 0 && i !== active) setActive(i);
          }}
          onClick={(e) => {
            const i = optionIndex(e);
            if (i >= 0 && options[i]) choose(options[i]);
          }}
          className="animate-scale-in scrollbar-thin z-50 mt-2 origin-top overflow-y-auto rounded-2xl border border-border bg-surface p-2 shadow-2xl shadow-black/60 max-sm:min-h-0 max-sm:flex-1 max-sm:border-0 max-sm:bg-background max-sm:shadow-none sm:absolute sm:inset-x-0 sm:top-full sm:max-h-[min(70vh,560px)]"
        >
          {query ? (
            <>
              <div {...optionProps(0)} className={rowClass(0)}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2">
                  <SearchIcon className="h-4 w-4 text-muted" />
                </span>
                <span className="min-w-0 flex-1 truncate">
                  Tìm “<span className="font-semibold text-foreground">{query}</span>”
                </span>
                <kbd className="hidden rounded border border-border px-1.5 text-[11px] text-muted sm:block">Enter</kbd>
              </div>

              {shown && shown.tags.length > 0 && (
                <>
                  <SectionTitle>Từ khoá</SectionTitle>
                  {shown.tags.map((tag, n) => {
                    const i = indexOf((o) => o.kind === "tag") + n;
                    return (
                      <div key={tag} {...optionProps(i)} className={rowClass(i)}>
                        <SearchIcon className="ml-2.5 h-4 w-4 shrink-0 text-muted" />
                        <span className="ml-2.5 min-w-0 truncate text-muted">
                          <Highlight text={tag} query={query} />
                        </span>
                      </div>
                    );
                  })}
                </>
              )}

              {shown && shown.categories.length > 0 && (
                <>
                  <SectionTitle>Chủ đề</SectionTitle>
                  {shown.categories.map((c, n) => {
                    const i = indexOf((o) => o.kind === "category") + n;
                    return (
                      <div key={c.slug} {...optionProps(i)} className={rowClass(i)}>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-lg">
                          {c.icon || "🖼️"}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-muted">
                          <Highlight text={c.name} query={query} />
                        </span>
                        <span className="text-xs text-muted">Chủ đề</span>
                      </div>
                    );
                  })}
                </>
              )}

              {shown && shown.wallpapers.length > 0 && (
                <>
                  <SectionTitle>Hình nền</SectionTitle>
                  {shown.wallpapers.map((w, n) => {
                    const i = indexOf((o) => o.kind === "wallpaper") + n;
                    return (
                      <div key={w.slug} {...optionProps(i)} className={rowClass(i)}>
                        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                          {w.image && (
                            <Image src={w.image} alt="" fill sizes="44px" className="object-cover" />
                          )}
                          {w.mediaType === "video" && (
                            <span className="absolute right-0.5 bottom-0.5 rounded bg-black/70 p-0.5 text-white">
                              <PlayIcon className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-muted">
                          <Highlight text={w.title} query={query} />
                        </span>
                      </div>
                    );
                  })}
                </>
              )}

              {shown && !shown.tags.length && !shown.categories.length && !shown.wallpapers.length && (
                <p className="px-3 py-6 text-center text-sm text-muted">
                  Chưa có gợi ý nào — nhấn Enter để tìm “{query}”.
                </p>
              )}
            </>
          ) : (
            <>
              {recent.length > 0 && (
                <>
                  <SectionTitle
                    action={
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={clearRecent}
                        className="text-xs font-medium text-muted hover:text-foreground"
                      >
                        Xoá tất cả
                      </button>
                    }
                  >
                    Tìm kiếm gần đây
                  </SectionTitle>
                  <div className="flex flex-wrap gap-2 px-2">
                    {recent.map((term, i) => (
                      <span
                        key={term}
                        className={`flex items-center rounded-full bg-surface-2 text-sm transition-colors ${
                          active === i ? "ring-2 ring-foreground/40" : ""
                        }`}
                      >
                        <span {...optionProps(i)} className="cursor-pointer py-1.5 pr-1 pl-3.5 text-foreground">
                          {term}
                        </span>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => removeRecent(term)}
                          aria-label={`Xoá “${term}” khỏi lịch sử`}
                          className="mr-1 flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-border hover:text-foreground"
                        >
                          <CloseIcon className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </>
              )}

              {shown?.trending && shown.trending.length > 0 && (
                <>
                  <SectionTitle>Đang thịnh hành</SectionTitle>
                  <div className="grid gap-1 px-1 sm:grid-cols-2">
                    {shown.trending.map((term, n) => {
                      const i = indexOf((o) => o.kind === "trend") + n;
                      return (
                        <div key={term} {...optionProps(i)} className={rowClass(i)}>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pin/15 text-pin">
                            <FlameIcon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 truncate font-medium text-foreground">{term}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {shown && shown.categories.length > 0 && (
                <>
                  <SectionTitle>Khám phá chủ đề</SectionTitle>
                  <div className="grid grid-cols-2 gap-2 px-2 pb-2 sm:grid-cols-4">
                    {shown.categories.map((c, n) => {
                      const i = indexOf((o) => o.kind === "category") + n;
                      return (
                        <div
                          key={c.slug}
                          {...optionProps(i)}
                          className={`pastel-flow relative flex h-16 cursor-pointer items-center justify-center overflow-hidden rounded-2xl text-center transition-transform ${
                            active === i ? "scale-[1.03] ring-2 ring-foreground/60" : ""
                          }`}
                          style={{ animationDelay: `-${n * 1.1}s` }}
                        >
                          <span className="absolute inset-0 bg-black/45" aria-hidden="true" />
                          <span className="relative px-2 text-sm font-bold text-white drop-shadow">
                            {c.icon ? `${c.icon} ` : ""}
                            {c.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {!shown && (
                <p className="px-3 py-6 text-center text-sm text-muted">Đang tải gợi ý...</p>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
}

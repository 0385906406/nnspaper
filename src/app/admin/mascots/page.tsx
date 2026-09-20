"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/admin/ui";
import { MASCOTS, MASCOT_GROUPS, SHEET_SIZE, SHEET_GRID, FRAME_SIZE } from "@/lib/mascots";
import type { MascotGroup } from "@/lib/mascots";

type Sheet = { url: string; publicId: string };
type CustomMascot = {
  _id: string;
  slug: string;
  name: string;
  group: MascotGroup;
  directions: Sheet;
  reactions: Sheet;
  isActive: boolean;
};

const INPUT =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30 focus:outline-none";
const LABEL = "block text-xs font-semibold tracking-wide text-muted uppercase mb-1.5";
const CARD = "rounded-xl border border-border bg-surface p-5";

/**
 * Thứ tự khung lấy từ mảng DIRECTIONS/REACTIONS trong source của page-mascot
 * (node_modules/page-mascot/dist/mascot.js). Đây là thứ tự BẮT BUỘC — component cắt
 * sprite bằng background-position theo đúng chỉ số này, nên vẽ lệch thứ tự là nhân
 * vật nhìn sai hướng hoặc sai biểu cảm.
 */
const DIRECTION_FRAMES = [
  "nhìn trên-trái",
  "nhìn lên",
  "nhìn trên-phải",
  "nhìn trái",
  "nhìn thẳng",
  "nhìn phải",
  "nhìn dưới-trái",
  "nhìn xuống",
  "nhìn dưới-phải",
];
const REACTION_FRAMES = [
  "nhắm mắt (blink)",
  "mắt trái tim (heart)",
  "mắt lấp lánh (sparkle)",
  "ngạc nhiên (surprised)",
  "nháy mắt (wink)",
  "bẽn lẽn (bashful)",
  "buồn ngủ (sleepy)",
  "choáng (dizzy)",
  "vui sướng (delighted)",
];

const INSTALL_CMD = "npx skills add nilbuild/page-mascot --skill page-mascot --global --yes";
const SKILL_USAGE = "/page-mascot a chibi otter with chocolate-brown fur";

const PROMPT_DIRECTIONS = `A single ${SHEET_SIZE}x${SHEET_SIZE} pixel image containing a ${SHEET_GRID}x${SHEET_GRID} grid of 9 frames (each frame ${FRAME_SIZE}x${FRAME_SIZE} px).
One chibi character, head-and-shoulders bust, flat vector style with clean outlines, transparent background.
The character must be IDENTICAL in every frame - same size, same position, same colours. Only the gaze direction changes.
Frame order, left to right then top to bottom:
1 looking up-left, 2 looking up, 3 looking up-right,
4 looking left, 5 looking straight at the viewer, 6 looking right,
7 looking down-left, 8 looking down, 9 looking down-right.
Character: <MO TA NHAN VAT CUA BAN>`;

const PROMPT_REACTIONS = `Same character as before, same ${SHEET_SIZE}x${SHEET_SIZE} image with a ${SHEET_GRID}x${SHEET_GRID} grid, same size and position, facing the viewer.
Only the facial expression changes between frames.
Frame order, left to right then top to bottom:
1 eyes closed (blink), 2 heart eyes, 3 sparkling eyes, 4 surprised,
5 winking, 6 bashful and blushing, 7 sleepy, 8 dizzy, 9 delighted.
Character: <MO TA NHAN VAT CUA BAN>`;

/** Nút copy cho các đoạn lệnh và prompt dài. */
function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          setDone(false);
        }
      }}
      className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      {done ? "Đã copy ✓" : "Copy"}
    </button>
  );
}

function CodeBlock({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-2 p-3">
      <pre className="min-w-0 flex-1 overflow-x-auto text-xs whitespace-pre-wrap text-foreground">
        {text}
      </pre>
      <Copy text={text} />
    </div>
  );
}

/**
 * Xem trước một khung của sprite, dùng đúng phép tính của page-mascot:
 * background-size 300% và background-position theo bước 50%.
 */
function SheetFrame({ url, index, size = 64 }: { url: string; index: number; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full bg-surface-2"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${url})`,
        backgroundSize: "300% 300%",
        backgroundRepeat: "no-repeat",
        backgroundPosition: `${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%`,
      }}
    />
  );
}

export default function MascotsAdminPage() {
  const [list, setList] = useState<CustomMascot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [group, setGroup] = useState<MascotGroup>("animal");
  const [directions, setDirections] = useState<File | null>(null);
  const [reactions, setReactions] = useState<File | null>(null);

  /**
   * Nạp danh sách. Dùng chuỗi .then chứ không await ở thân hàm: gọi thẳng một hàm
   * async đặt state trong useEffect bị react-hooks/set-state-in-effect chặn, và
   * các trang admin khác cũng đang theo cùng kiểu này.
   */
  function load() {
    return fetch("/api/admin/mascots")
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 403 ? "Bạn không có quyền quản lý nhân vật." : "Không tải được danh sách."
          );
        }
        return res.json();
      })
      .then((data) => setList(data.mascots ?? []))
      .catch((err: Error) => setError(err.message || "Không kết nối được máy chủ."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!directions || !reactions) {
      setError("Cần cả hai sprite: 9 hướng nhìn và 9 biểu cảm.");
      return;
    }
    const form = e.currentTarget;

    setBusy(true);
    setError("");
    setNotice("");

    const body = new FormData();
    body.append("name", name);
    body.append("slug", slug);
    body.append("group", group);
    body.append("directions", directions);
    body.append("reactions", reactions);

    try {
      const res = await fetch("/api/admin/mascots", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Không thêm được nhân vật.");
        return;
      }
      setNotice(`Đã thêm "${data.name}". Nhân vật đã hiện ở trang chọn của người dùng.`);
      setName("");
      setSlug("");
      setDirections(null);
      setReactions(null);
      form.reset();
      load();
    } catch {
      setError("Không kết nối được máy chủ.");
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, updates: Record<string, unknown>) {
    setError("");
    setNotice("");
    const res = await fetch(`/api/admin/mascots/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Không cập nhật được.");
      return;
    }
    if (data.movedUsers) {
      setNotice(
        `Đã tắt nhân vật. ${data.movedUsers} người đang dùng nó được chuyển về nhân vật mặc định.`
      );
    }
    load();
  }

  async function remove(m: CustomMascot) {
    if (
      !confirm(`Xoá nhân vật "${m.name}"? Sprite trên Cloudinary cũng bị xoá và không lấy lại được.`)
    ) {
      return;
    }
    setError("");
    setNotice("");
    const res = await fetch(`/api/admin/mascots/${m._id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Không xoá được.");
      return;
    }
    setNotice(
      data.movedUsers
        ? `Đã xoá. ${data.movedUsers} người đang dùng nó được chuyển về nhân vật mặc định.`
        : "Đã xoá."
    );
    load();
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold text-foreground">🦊 Nhân vật</h1>
        <p className="mt-1 text-muted">
          Người dùng chọn nhân vật làm ảnh đại diện trong trang cá nhân. Site có sẵn {MASCOTS.length}{" "}
          nhân vật gốc; thêm ở đây là nhân vật riêng của bạn.
        </p>
      </div>

      {error && <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
      {notice && (
        <div className="rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-500">{notice}</div>
      )}

      {/* Hướng dẫn tạo sprite */}
      <details className={CARD} open>
        <summary className="cursor-pointer text-lg font-semibold text-foreground">
          Cách tạo sprite cho nhân vật mới
        </summary>

        <div className="mt-4 space-y-5 text-sm text-foreground">
          <div>
            <h3 className="mb-2 font-semibold">Mỗi nhân vật cần đúng 2 ảnh</h3>
            <ul className="list-inside list-disc space-y-1 text-muted">
              <li>
                Kích thước{" "}
                <strong className="text-foreground">
                  {SHEET_SIZE}×{SHEET_SIZE}px
                </strong>
                , chia lưới{" "}
                <strong className="text-foreground">
                  {SHEET_GRID}×{SHEET_GRID}
                </strong>{" "}
                → mỗi khung {FRAME_SIZE}×{FRAME_SIZE}px
              </li>
              <li>Định dạng WEBP hoặc PNG, nền trong suốt, tối đa 2MB mỗi ảnh</li>
              <li>
                Nhân vật phải <strong className="text-foreground">giống hệt nhau</strong> ở cả 9 khung
                — cùng cỡ, cùng vị trí. Lệch là nhân vật sẽ giật khi đổi khung.
              </li>
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
                Sheet 1 — 9 hướng nhìn
              </h4>
              <ol className="grid grid-cols-3 gap-1 text-xs">
                {DIRECTION_FRAMES.map((f, i) => (
                  <li key={f} className="rounded border border-border bg-surface-2 px-2 py-1.5">
                    <span className="text-muted">{i + 1}.</span> {f}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
                Sheet 2 — 9 biểu cảm
              </h4>
              <ol className="grid grid-cols-3 gap-1 text-xs">
                {REACTION_FRAMES.map((f, i) => (
                  <li key={f} className="rounded border border-border bg-surface-2 px-2 py-1.5">
                    <span className="text-muted">{i + 1}.</span> {f}
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <p className="text-xs text-muted">
            Thứ tự trên là <strong className="text-foreground">bắt buộc</strong>, đọc từ trái sang phải
            rồi xuống hàng. Nó lấy từ chính source của page-mascot vì component cắt sprite theo đúng
            chỉ số này — vẽ lệch thứ tự là nhân vật nhìn sai hướng.
          </p>

          <hr className="border-border/60" />

          <div>
            <h3 className="mb-1 font-semibold">Cách 1 — Tải nhân vật vẽ sẵn (miễn phí)</h3>
            <p className="mb-2 text-muted">
              Chọn nhân vật rồi tải về 2 sheet, không cần API key. {MASCOTS.length} nhân vật gốc của
              site lấy từ đây.
            </p>
            <a
              href="https://koboyo.com/page-mascot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              koboyo.com/page-mascot →
            </a>
          </div>

          <div>
            <h3 className="mb-1 font-semibold">Cách 2 — Để AI vẽ bằng skill (mất phí theo ảnh)</h3>
            <p className="mb-2 text-muted">
              Cài skill rồi nhờ agent vẽ. Nó tự ghép 2 sheet và tự kiểm tra nhân vật không lệch giữa
              các khung. Chạy trong Claude Code thì cần <code>OPENAI_API_KEY</code>.
            </p>
            <div className="space-y-2">
              <CodeBlock text={INSTALL_CMD} />
              <CodeBlock text={SKILL_USAGE} />
            </div>
          </div>

          <div>
            <h3 className="mb-1 font-semibold">Cách 3 — Prompt thủ công (miễn phí)</h3>
            <p className="mb-2 text-muted">
              Copy hai prompt dưới đây, dán vào bất kỳ chat AI có sinh ảnh, thay{" "}
              <code>&lt;MO TA NHAN VAT CUA BAN&gt;</code> bằng mô tả của bạn. Dùng cùng một mô tả cho
              cả hai prompt để nhân vật không đổi hình giữa hai sheet.
            </p>
            <div className="space-y-2">
              <CodeBlock text={PROMPT_DIRECTIONS} />
              <CodeBlock text={PROMPT_REACTIONS} />
            </div>
          </div>
        </div>
      </details>

      {/* Thêm nhân vật */}
      <form onSubmit={create} className={CARD}>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Thêm nhân vật</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={LABEL} htmlFor="m-name">
              Tên
            </label>
            <input
              id="m-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Rái cá nâu"
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="m-slug">
              Slug (trống thì tự sinh)
            </label>
            <input
              id="m-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="rai-ca-nau"
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="m-group">
              Nhóm
            </label>
            <select
              id="m-group"
              value={group}
              onChange={(e) => setGroup(e.target.value as MascotGroup)}
              className={INPUT}
            >
              {MASCOT_GROUPS.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="m-dir">
              Sheet 9 hướng nhìn
            </label>
            <input
              id="m-dir"
              type="file"
              accept="image/webp,image/png"
              onChange={(e) => setDirections(e.target.files?.[0] ?? null)}
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="m-rea">
              Sheet 9 biểu cảm
            </label>
            <input
              id="m-rea"
              type="file"
              accept="image/webp,image/png"
              onChange={(e) => setReactions(e.target.files?.[0] ?? null)}
              className={INPUT}
            />
          </div>
        </div>

        <div className="mt-4">
          <Button type="submit" variant="primary" isLoading={busy}>
            Thêm nhân vật
          </Button>
        </div>
      </form>

      {/* Danh sách nhân vật tuỳ chỉnh */}
      <section className={CARD}>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Nhân vật của bạn {list.length > 0 && <span className="text-muted">({list.length})</span>}
        </h2>

        {loading ? (
          <p className="text-sm text-muted">Đang tải…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted">
            Chưa có nhân vật riêng nào. Người dùng vẫn chọn được {MASCOTS.length} nhân vật gốc.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {list.map((m) => (
              <li key={m._id} className="flex flex-wrap items-center gap-4 py-3">
                {/* Khung "nhìn thẳng" (chỉ số 4) là khung đại diện dễ nhận nhất */}
                <SheetFrame url={m.directions.url} index={4} />

                <div className="min-w-0 flex-1">
                  <input
                    value={m.name}
                    onChange={(e) =>
                      setList((prev) =>
                        prev.map((x) => (x._id === m._id ? { ...x, name: e.target.value } : x))
                      )
                    }
                    onBlur={(e) =>
                      e.target.value.trim() && patch(m._id, { name: e.target.value.trim() })
                    }
                    className="w-full max-w-56 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-foreground hover:border-border focus:border-accent focus:outline-none"
                  />
                  <p className="px-1 text-xs text-muted">
                    <code>{m.slug}</code>
                    {!m.isActive && <span className="ml-2 text-danger">đang tắt</span>}
                  </p>
                </div>

                <select
                  value={m.group}
                  onChange={(e) => patch(m._id, { group: e.target.value })}
                  className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs text-foreground"
                >
                  {MASCOT_GROUPS.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.label}
                    </option>
                  ))}
                </select>

                {/* Vài biểu cảm để soát nhanh xem sheet có đúng thứ tự không */}
                <div className="flex shrink-0 gap-1">
                  {[0, 3, 8].map((i) => (
                    <SheetFrame key={i} url={m.reactions.url} index={i} size={32} />
                  ))}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => patch(m._id, { isActive: !m.isActive })}
                >
                  {m.isActive ? "Tắt" : "Bật"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(m)}>
                  Xoá
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Bộ gốc, chỉ để tham khảo */}
      <details className={CARD}>
        <summary className="cursor-pointer text-lg font-semibold text-foreground">
          {MASCOTS.length} nhân vật gốc (không sửa được ở đây)
        </summary>
        <p className="mt-2 mb-3 text-sm text-muted">
          Bộ gốc nằm trong code và file tĩnh nên không quản lý qua trang này. Thêm hoặc bớt cần sửa{" "}
          <code>src/lib/mascots.ts</code> rồi deploy lại.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {MASCOTS.map((m) => (
            <span
              key={m.slug}
              className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs text-muted"
            >
              {m.name}
            </span>
          ))}
        </div>
      </details>
    </div>
  );
}

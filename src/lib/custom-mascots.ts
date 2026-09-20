import "server-only";
import { connectDB } from "@/lib/mongodb";
import { Mascot } from "@/models/Mascot";
import {
  MASCOTS,
  NO_MASCOT,
  isBuiltInMascot,
  isMascotChoice,
  mascotSheets,
  type MascotGroup,
  type MascotOption,
} from "@/lib/mascots";

/** Một nhân vật kèm luôn đường dẫn hai sprite, đủ để client vẽ ngay. */
export type MascotEntry = MascotOption & {
  directions: string;
  reactions: string;
  custom: boolean;
};

type CustomDoc = {
  slug: string;
  name: string;
  group?: string;
  directions?: { url?: string };
  reactions?: { url?: string };
};

/**
 * Toàn bộ nhân vật đang dùng được: bộ gốc trước, nhân vật admin tự thêm sau.
 *
 * DB lỗi thì trả về bộ gốc thay vì ném lỗi — mất vài nhân vật tuỳ chỉnh còn hơn
 * làm trắng trang chọn nhân vật và trang cá nhân.
 */
export async function listMascots(): Promise<MascotEntry[]> {
  const builtIn: MascotEntry[] = MASCOTS.map((m) => ({
    ...m,
    ...mascotSheets(m.slug),
    custom: false,
  }));

  try {
    await connectDB();
    const docs = (await Mascot.find({ isActive: true })
      .sort({ createdAt: 1 })
      .lean()) as unknown as CustomDoc[];

    const custom: MascotEntry[] = docs
      // Thiếu sprite thì bỏ qua: hiện ra chỉ thành một ô trống không bấm được
      .filter((d) => d.directions?.url && d.reactions?.url)
      .map((d) => ({
        slug: d.slug,
        name: d.name,
        group: (d.group as MascotGroup) ?? "animal",
        ...mascotSheets(d.slug),
        custom: true,
      }));

    return [...builtIn, ...custom];
  } catch (error) {
    console.error("[mascots] Không đọc được nhân vật tuỳ chỉnh:", error);
    return builtIn;
  }
}

/** Sprite thật của một nhân vật tuỳ chỉnh, để route trung gian chuyển hướng tới. */
export async function customMascotSheet(
  slug: string,
  sheet: "directions" | "reactions"
): Promise<string | null> {
  if (isBuiltInMascot(slug)) return null;
  try {
    await connectDB();
    const doc = (await Mascot.findOne({ slug, isActive: true })
      .select("directions reactions")
      .lean()) as unknown as CustomDoc | null;
    return doc?.[sheet]?.url ?? null;
  } catch (error) {
    console.error("[mascots] Không đọc được sprite:", slug, error);
    return null;
  }
}

/**
 * Chốt kiểm tra thật khi người dùng chọn nhân vật.
 *
 * `isMascotChoice` chỉ xét dạng chuỗi vì client không tra được DB; hàm này mới
 * khẳng định nhân vật có tồn tại và đang bật, để không ai lưu được slug bịa ra.
 */
export async function isKnownMascot(value: unknown): Promise<boolean> {
  if (!isMascotChoice(value)) return false;
  if (value === NO_MASCOT || isBuiltInMascot(value)) return true;
  try {
    await connectDB();
    return Boolean(await Mascot.exists({ slug: value, isActive: true }));
  } catch {
    return false;
  }
}

import "server-only";
import mongoose from "mongoose";
import { withDb } from "@/lib/data-source";
import { avatarMascot } from "@/lib/mascots";
import { Comment } from "@/models/Comment";
import { User } from "@/models/User";
import { Wallpaper } from "@/models/Wallpaper";
import { addMockComment, findMockComment, getMockComments, removeMockComment } from "@/lib/mock-data";

export const COMMENT_MAX_LENGTH = 500;
/** Khoảng cách tối thiểu giữa hai bình luận của cùng một người, chống spam. */
export const COMMENT_COOLDOWN_MS = 10_000;

export type CommentView = {
  id: string;
  wallpaperSlug: string;
  userId: string;
  userName: string;
  /** Nhân vật hiện tại của người viết — dùng làm avatar (không có ảnh tải lên). */
  userMascot: string;
  content: string;
  createdAt: string;
};

type RawComment = {
  _id: { toString(): string };
  wallpaperSlug: string;
  userId: string;
  userName?: string;
  content: string;
  createdAt: Date;
};

function toCommentView(doc: RawComment, mascot?: string | null): CommentView {
  return {
    id: String(doc._id),
    wallpaperSlug: doc.wallpaperSlug,
    userId: doc.userId,
    userName: doc.userName || "Người dùng",
    userMascot: avatarMascot(mascot),
    content: doc.content,
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}

/** Nhân vật hiện tại của nhiều người dùng, tra một lần. */
async function mascotsOf(userIds: string[]): Promise<Map<string, string | undefined>> {
  const ids = [...new Set(userIds)].filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!ids.length) return new Map();
  const users = await User.find({ _id: { $in: ids } })
    .select({ mascot: 1 })
    .lean<{ _id: unknown; mascot?: string }[]>();
  return new Map(users.map((u) => [String(u._id), u.mascot]));
}

/**
 * Điều kiện "đang hiển thị". Dùng `$ne: "hidden"` thay vì `"visible"` vì bình
 * luận tạo trước khi có trường status không mang trường này.
 */
export const VISIBLE = { status: { $ne: "hidden" } } as const;

/** Bình luận đang hiển thị của một hình nền, mới nhất trước. */
export async function getComments(wallpaperSlug: string, limit = 50): Promise<CommentView[]> {
  return withDb(
    async () => {
      const docs = await Comment.find({ wallpaperSlug, ...VISIBLE })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean<RawComment[]>();
      // Avatar lấy theo nhân vật *hiện tại*: người viết đổi nhân vật thì bình luận cũ đổi theo
      const mascots = await mascotsOf(docs.map((d) => d.userId));
      return docs.map((d) => toCommentView(d, mascots.get(d.userId)));
    },
    () => getMockComments(wallpaperSlug).slice(0, limit)
  );
}

/** Đếm lại số bình luận đang hiện và ghi vào hình nền — gọi sau mọi thao tác thêm/ẩn/xoá. */
export async function syncCommentCount(wallpaperSlugs: string | string[]): Promise<void> {
  const slugs = [...new Set(Array.isArray(wallpaperSlugs) ? wallpaperSlugs : [wallpaperSlugs])];
  await Promise.all(
    slugs.map(async (slug) => {
      const count = await Comment.countDocuments({ wallpaperSlug: slug, ...VISIBLE });
      await Wallpaper.updateOne({ slug }, { $set: { commentCount: count } });
    })
  );
}

export type NewCommentInput = {
  wallpaperSlug: string;
  wallpaperTitle: string;
  userId: string;
  userName: string;
  /** Nhân vật hiện tại của người viết (chỉ để trả về, không lưu vào bình luận). */
  userMascot?: string | null;
  content: string;
};

export async function addComment(
  input: NewCommentInput
): Promise<{ comment: CommentView } | { error: string; status: number }> {
  return withDb(
    async () => {
      const last = await Comment.findOne({ userId: input.userId })
        .sort({ createdAt: -1 })
        .select({ createdAt: 1 })
        .lean<{ createdAt: Date } | null>();
      if (last && Date.now() - new Date(last.createdAt).getTime() < COMMENT_COOLDOWN_MS) {
        return { error: "Bạn bình luận hơi nhanh, đợi vài giây rồi thử lại nhé.", status: 429 };
      }

      const { userMascot, ...fields } = input;
      const doc = await Comment.create(fields);
      await syncCommentCount(input.wallpaperSlug);
      return { comment: toCommentView(doc.toObject() as unknown as RawComment, userMascot) };
    },
    () => ({
      comment: addMockComment({
        wallpaperSlug: input.wallpaperSlug,
        userId: input.userId,
        userName: input.userName,
        userMascot: avatarMascot(input.userMascot),
        content: input.content,
      }),
    })
  );
}

/** Xoá bình luận; chỉ chủ bình luận hoặc người có quyền `comment.delete` được xoá. */
export async function deleteComment(
  id: string,
  actor: { userId: string; canModerate: boolean }
): Promise<{ ok: true } | { error: string; status: number }> {
  return withDb(
    async () => {
      const doc = await Comment.findById(id).catch(() => null);
      if (!doc) return { error: "Không tìm thấy bình luận", status: 404 };
      if (doc.userId !== actor.userId && !actor.canModerate) {
        return { error: "Bạn không thể xoá bình luận của người khác", status: 403 };
      }
      await doc.deleteOne();
      await syncCommentCount(doc.wallpaperSlug);
      return { ok: true as const };
    },
    () => {
      const existing = findMockComment(id);
      if (!existing) return { error: "Không tìm thấy bình luận", status: 404 };
      if (existing.userId !== actor.userId && !actor.canModerate) {
        return { error: "Bạn không thể xoá bình luận của người khác", status: 403 };
      }
      removeMockComment(id);
      return { ok: true as const };
    }
  );
}

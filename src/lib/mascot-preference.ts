import "server-only";
import { cache } from "react";
import mongoose from "mongoose";
import { withDb } from "@/lib/data-source";
import { DEFAULT_MASCOT, isMascotChoice } from "@/lib/mascots";
import { User } from "@/models/User";

/** Nhân vật của người dùng (hoặc mặc định). Gộp truy vấn trong một request nhờ `cache`. */
export const getUserMascot = cache(async (userId?: string | null): Promise<string> => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return DEFAULT_MASCOT;
  return withDb(
    async () => {
      const doc = await User.findById(userId).select({ mascot: 1 }).lean<{ mascot?: string } | null>();
      return isMascotChoice(doc?.mascot) ? doc!.mascot! : DEFAULT_MASCOT;
    },
    () => DEFAULT_MASCOT
  );
});

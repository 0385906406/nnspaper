import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      phone?: string;
      role?: string;
    } & DefaultSession["user"];
  }

  interface User {
    phone?: string;
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    phone?: string;
    role?: string;
    /** Lần cuối đọc lại quyền từ DB (ms). */
    syncedAt?: number;
  }
}

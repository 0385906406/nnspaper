import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/** Trang đăng nhập/đăng ký nằm dưới /admin nhưng phải mở cho khách. */
const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/admin/signup"]);

const LOGIN_PATH = "/dang-nhap";

function loginRedirect(request: NextRequest, next: string, error?: string) {
  const url = new URL(LOGIN_PATH, request.url);
  if (next !== "/") url.searchParams.set("next", next);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ADMIN_PATHS.has(pathname)) return NextResponse.next();
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const secureCookie = request.nextUrl.protocol === "https:";
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie,
    salt: secureCookie ? "__Secure-authjs.session-token" : "authjs.session-token",
  });

  if (!token?.id) return loginRedirect(request, pathname);

  // Không chặn theo role ở đây: role trong token có thể đã cũ (vừa được nâng lên
  // editor mà vẫn bị đá ra). Layout /admin kiểm tra quyền bằng dữ liệu DB.
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

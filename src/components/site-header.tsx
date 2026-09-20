import Link from "next/link";
import type { Session } from "next-auth";
import { UserMenu } from "@/components/user-menu";
import { SiteLogo } from "@/components/site-logo";
import { SearchBox } from "@/components/search-box";

/** Thanh trên cùng: ô tìm kiếm chiếm gần hết chiều ngang + menu tài khoản (kiểu Pinterest). */
export function SiteHeader({
  searchQuery,
  session,
  mascot,
  siteName,
  logoMode,
  logoText,
  logoImage,
}: {
  searchQuery?: string;
  session: Session | null;
  mascot: string;
  siteName: string;
  logoMode: "text" | "image";
  logoText: string;
  logoImage: string;
}) {
  return (
    // Nền đặc, không dùng backdrop-blur: blur biến header thành khung chứa cho
    // phần tử fixed, làm màn hình tìm kiếm toàn màn hình trên mobile bị kẹt trong header
    // z-40 (ngang thanh tab mobile, đứng sau trong DOM nên nằm trên) để màn hình
    // tìm kiếm toàn màn hình không bị thanh tab dưới đáy đè lên
    <header className="sticky top-0 z-40 bg-background">
      <div className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 lg:px-6">
        {/* Desktop đã có logo ở thanh dọc */}
        <Link href="/" aria-label={siteName} className="group shrink-0 lg:hidden">
          <SiteLogo mode={logoMode} text={logoText} image={logoImage} siteName={siteName} size="sm" interactive />
        </Link>

        <SearchBox initialQuery={searchQuery ?? ""} />

        <UserMenu session={session} mascot={mascot} />
      </div>
    </header>
  );
}

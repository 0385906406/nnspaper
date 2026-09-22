import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { ToastContainer } from "@/components/toast-container";
import { siteConfig, absoluteUrl } from "@/lib/site";
import { JsonLd, organizationJsonLd, ORGANIZATION_ID, WEBSITE_ID } from "@/lib/seo";
import { getSettings, robotsFor } from "@/lib/settings";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

// Đọc từ DB nên phải là generateMetadata (async), không dùng được `export const
// metadata` vì giá trị đó bị chốt lúc build
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${settings.site_name} — Hình nền & Video nền 4K cho điện thoại, máy tính`,
      template: `%s | ${settings.site_name}`,
    },
    description: settings.site_description,
    keywords: settings.site_keywords,
    authors: [{ name: siteConfig.author.name, url: siteConfig.author.url }],
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      siteName: settings.site_name,
      title: settings.site_name,
      description: settings.site_description,
      url: siteConfig.url,
      images: [
        {
          url: absoluteUrl("/opengraph-image"),
          width: 1200,
          height: 630,
          alt: `${settings.site_name} - Hình nền và video nền 4K`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitter,
      title: settings.site_name,
      description: settings.site_description,
      images: [absoluteUrl("/twitter-image")],
    },
    // Favicon mặc định để ở public/ chứ không phải app/favicon.ico: quy ước file
    // của Next luôn tự chèn thêm một thẻ <link rel="icon"> nữa, thành hai thẻ
    // tranh nhau và trình duyệt có thể chọn cái mặc định thay vì cái admin đặt.
    icons: {
      icon: settings.site_favicon || "/favicon.ico",
      apple: settings.site_favicon || "/favicon.ico",
    },
    // Bảo trì thì chặn công cụ tìm kiếm lập chỉ mục (robotsFor tự xử lý),
    // kèm chỉ thị xin ảnh xem trước cỡ lớn cho Googlebot.
    robots: await robotsFor(),
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
      : {}),
  };
}

export const viewport: Viewport = {
  themeColor: "#0a0a0d",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();

  const jsonLd = [
    organizationJsonLd({
      name: settings.site_name,
      logo: settings.site_logo_image || settings.site_favicon || "/favicon.ico",
      email: settings.contact_email,
    }),
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      name: settings.site_name,
      url: absoluteUrl("/"),
      description: settings.site_description,
      inLanguage: siteConfig.lang,
      // Nối WebSite với Organization để Google gộp hai schema thành một thực thể
      // thay vì coi đây là hai chủ thể không liên quan.
      publisher: { "@id": ORGANIZATION_ID },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${absoluteUrl("/")}?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ];

  return (
    <html lang={siteConfig.lang} className={`${inter.variable} h-full`}>
      <body className="min-h-full antialiased">
        <JsonLd data={jsonLd} />
        <SessionProvider>
          <ToastContainer />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}

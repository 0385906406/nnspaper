import { siteConfig, absoluteUrl } from "@/lib/site";

/**
 * Helper JSON-LD + canonical dùng chung cho mọi trang.
 *
 * Gom về một chỗ vì hai lý do: dữ liệu có cấu trúc phải nhất quán giữa các trang
 * (Google đối chiếu @id giữa các schema với nhau), và quy tắc canonical cho trang
 * phân trang rất dễ làm sai ở từng trang một.
 */

/** @id cố định của site và tổ chức — để các schema khác trỏ về bằng tham chiếu. */
export const WEBSITE_ID = `${absoluteUrl("/")}#website`;
export const ORGANIZATION_ID = `${absoluteUrl("/")}#organization`;

/**
 * Canonical cho trang danh sách có phân trang.
 *
 * Trang 2 trở đi phải tự trỏ canonical về chính nó, KHÔNG trỏ về trang 1. Trỏ về
 * trang 1 là nói với Google "trang này trùng nội dung trang 1" — sai, vì mỗi trang
 * là một tập ảnh khác nhau — và khi kết hợp với noindex thì tín hiệu noindex có
 * thể lan ngược về trang 1, làm rụng luôn trang quan trọng nhất của danh mục.
 *
 * Các tham số lọc (device, sort, type) cố tình bị loại khỏi canonical: chúng chỉ
 * sắp xếp lại cùng một kho ảnh nên gộp về bản không lọc của đúng trang đó.
 */
export function listingCanonical(path: string, page = 1): string {
  return absoluteUrl(page > 1 ? `${path}?page=${page}` : path);
}

/**
 * Schema tổ chức phát hành — nguồn của E-E-A-T và là ứng viên cho knowledge panel.
 * Các schema khác (Website, ImageObject...) trỏ về đây qua ORGANIZATION_ID thay vì
 * lặp lại thông tin.
 */
export function organizationJsonLd(input: { name: string; logo?: string; email?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: input.name,
    url: absoluteUrl("/"),
    ...(input.logo ? { logo: { "@type": "ImageObject", url: absoluteUrl(input.logo) } } : {}),
    ...(input.email ? { email: input.email } : {}),
    sameAs: [] as string[],
  };
}

/** Breadcrumb dạng dữ liệu có cấu trúc — Google thay URL trong kết quả bằng chuỗi này. */
export function breadcrumbJsonLd(items: { name: string; path?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      // Mục cuối (trang hiện tại) bỏ `item` theo đúng khuyến nghị của Google.
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

/**
 * Trang danh sách + danh sách ảnh trong đó.
 *
 * ItemList cho Google biết trang này là một bộ sưu tập chứ không phải nội dung
 * mỏng bị lặp, và nêu rõ ảnh nào thuộc trang nào khi phân trang.
 */
export function collectionPageJsonLd(input: {
  name: string;
  description: string;
  path: string;
  page?: number;
  items: { slug: string; title: string }[];
  totalItems?: number;
}) {
  const url = listingCanonical(input.path, input.page ?? 1);

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    url,
    name: input.name,
    description: input.description,
    inLanguage: siteConfig.lang,
    isPartOf: { "@id": WEBSITE_ID },
    ...(input.totalItems ? { numberOfItems: input.totalItems } : {}),
    mainEntity: {
      "@type": "ItemList",
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: input.items.length,
      // Vị trí đánh số lại từ 1 trên mỗi trang, không cộng dồn qua các trang.
      // Mỗi trang là một ItemList riêng (@id gắn với URL của chính trang đó), và
      // số ảnh mỗi trang là một tuỳ chọn trong admin nên không suy ra được mốc
      // bắt đầu — đánh số cộng dồn sẽ sai ngay ở trang cuối (trang thiếu ảnh).
      itemListElement: input.items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/hinh-nen/${item.slug}`),
        name: item.title,
      })),
    },
  };
}

/** Thẻ <script> JSON-LD. Nhận một schema hoặc cả mảng schema. */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

import "server-only";
import { destroyAsset } from "@/lib/cloudinary";
import { destroyUnusedAsset } from "@/lib/cloudinary-assets";
import { deleteR2Object } from "@/lib/r2";

/** Phần tối thiểu của một media cần biết để xoá đúng nơi nó đang nằm. */
export type StoredAsset = {
  publicId?: string | null;
  resourceType?: string | null;
  provider?: string | null;
};

/**
 * Xoá file ở đúng kho đang giữ nó.
 *
 * Từ khi video tách sang R2, `publicId` không còn chỉ là public_id của Cloudinary
 * mà có thể là object key của R2 — gọi thẳng API Cloudinary cho một key R2 thì
 * lặng lẽ không xoá được gì và file nằm lại mãi. Trường `provider` trên media là
 * thứ phân biệt; bản ghi cũ không có nó nên mặc định là Cloudinary.
 */
export async function destroyStoredAsset(asset: StoredAsset): Promise<boolean> {
  if (!asset?.publicId) return false;

  if (asset.provider === "r2") return deleteR2Object(asset.publicId);

  try {
    await destroyAsset(asset.publicId, asset.resourceType === "video" ? "video" : "image");
    return true;
  } catch (error) {
    console.error("Không xoá được file trên Cloudinary:", asset.publicId, error);
    return false;
  }
}

/** Như trên, nhưng chỉ xoá khi không hình nền nào còn tham chiếu tới file. */
export async function destroyUnusedStoredAsset(asset: StoredAsset): Promise<boolean> {
  if (!asset?.publicId) return false;

  if (asset.provider === "r2") return deleteR2Object(asset.publicId);

  return destroyUnusedAsset(asset.publicId, asset.resourceType === "video" ? "video" : "image");
}

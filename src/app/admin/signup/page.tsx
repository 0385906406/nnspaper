import { redirect } from "next/navigation";

/**
 * Đăng ký công khai luôn tạo tài khoản role "viewer", nên không có lý do để
 * tồn tại một trang đăng ký riêng mang nhãn admin — nó chỉ gây hiểu nhầm rằng
 * có thể tự đăng ký quyền quản trị. Tài khoản admin do admin tạo trong /admin/users.
 */
export default function AdminSignupRedirect() {
  redirect("/dang-ky");
}

import { redirect } from "next/navigation";

/**
 * Giữ lại đường dẫn cũ nhưng dồn về một trang đăng nhập duy nhất (/dang-nhap).
 * Hai trang đăng nhập song song trước đây gây vòng lặp chuyển hướng vì
 * /admin/login vừa là đích chuyển hướng vừa nằm trong vùng cần đăng nhập.
 */
export default function AdminLoginRedirect() {
  redirect("/dang-nhap?next=%2Fadmin");
}

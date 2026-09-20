/**
 * Rút gọn dãy số trang thành dạng 1 … 4 5 6 … 20 để thanh phân trang không dài
 * vô hạn khi có hàng trăm trang. `null` là chỗ hiện dấu "…".
 *
 * Dùng chung cho phân trang trang công khai (điều hướng bằng <Link>) và trang
 * quản trị (điều hướng bằng state), vì hai bên chỉ khác cách bấm chứ dãy số phải giống nhau.
 */
export function pageItems(current: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const wanted = new Set([1, totalPages, current, current - 1, current + 1]);
  const sorted = [...wanted].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const result: (number | null)[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push(null);
    result.push(sorted[i]);
  }
  return result;
}

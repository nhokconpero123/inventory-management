/** Đọc secret lúc dùng (không đọc lúc import) để test tự đặt được biến môi trường. */
export function jwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error('JWT_SECRET thiếu hoặc ngắn hơn 32 ký tự');
  return s;
}
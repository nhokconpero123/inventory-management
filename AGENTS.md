# Inventory Management — hướng dẫn cho AI agent

## Stack
React + Vite + Tailwind (client/), Node.js + Express + TypeScript (server/),
SQLite qua better-sqlite3, zod, bcryptjs, jsonwebtoken, Vitest + Supertest.
Môi trường phát triển: Windows + PowerShell (lệnh shell phải là cú pháp PowerShell).

## Quy tắc bắt buộc
1. Đọc `server/src/db/schema.sql` trước khi viết bất kỳ truy vấn nào.
2. KHÔNG tự tạo bảng/cột ngoài schema. Cần thay đổi → nêu đề xuất, chờ duyệt.
3. `products.quantity` chỉ đổi qua `recordMovement()`. Cấm UPDATE trực tiếp ở nơi khác.
4. `stock_movements` bất biến (không UPDATE/DELETE).
5. Mọi route ghi dữ liệu phải qua `requireAuth` + `requireRole`.
6. `created_by` lấy từ JWT, không lấy từ body.
7. Validation bằng zod ở mọi endpoint. Lỗi: 400 validation, 401/403 quyền,
   404 không tìm thấy, 409 thiếu tồn kho.
8. Route cố định (`/products/low-stock`) khai báo TRƯỚC `/products/:id`.

## Phân quyền
admin: tất cả. staff: đọc + movements IN/OUT.
ADJUST, products, categories, users: chỉ admin.

## Cách làm việc
- Chạy `npm test` (ở gốc) trước khi báo xong. Test dùng SQLite `:memory:` qua `createApp(db)`.
- Một tác vụ nhỏ mỗi lần. Chỉ sửa file được nêu trong yêu cầu.
- Theo đúng style của `server/src/modules/categories/` (module mẫu).
- Không in secret, không commit `.env`.
- Thông tin không có trong tài liệu → nói rõ, không tự bịa.

## Lệnh
npm run dev | npm run dev:client | npm test | npm run seed

## Quy tắc frontend (client/)
- React + TypeScript + Tailwind + TanStack Query + react-router. KHÔNG thêm thư viện mới.
- Mọi gọi API đi qua `api()` trong `client/src/api.ts`. Không dùng fetch trực tiếp.
- Không sửa `api.ts`, `types.ts`, `auth-context.ts`, `AuthProvider.tsx`, `RouteGuards.tsx`.
  Cần đổi thì nêu đề xuất.
- Trang đặt ở `src/pages/`, component dùng lại ở `src/components/`. Mỗi tác vụ chỉ sửa file được nêu,
  và chỉ thêm đúng một dòng route vào `App.tsx`.
- Giao diện tiếng Việt, responsive (dùng được ở 375px). Luôn có trạng thái loading, rỗng, lỗi
  (dùng `errorMessage()` để hiện lỗi).
- Quyền ở UI chỉ để ẩn/hiện nút. Server mới là nơi kiểm tra quyền thật.
- Lệnh kiểm tra trước khi báo xong: `npm run build -w client` và `npm run lint -w client`.
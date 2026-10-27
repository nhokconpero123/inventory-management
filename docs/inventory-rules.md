# Quy Tắc Quản Lý Tồn Kho (Inventory Rules)

## 1. Tồn kho không âm
- Số lượng tồn kho (`quantity`) của sản phẩm không bao giờ được phép nhỏ hơn 0.
- Nếu thao tác xuất kho (`OUT`) hoặc điều chỉnh (`ADJUST`) làm tồn kho xuống dưới 0, hệ thống sẽ từ chối giao dịch và trả về mã lỗi **409 Conflict** (thiếu tồn kho).

## 2. Ý nghĩa loại biến động (Movement Types)
- **`IN` (Nhập kho)**: Tăng thêm số lượng tồn kho của sản phẩm. (Thực hiện: Staff+)
- **`OUT` (Xuất kho)**: Giảm bớt số lượng tồn kho của sản phẩm. (Thực hiện: Staff+)
- **`ADJUST` (Điều chỉnh)**: Tăng hoặc giảm số lượng tồn kho để đồng bộ với thực tế sau kiểm kê. **Chỉ Admin** mới có quyền thực hiện.

## 3. Cảnh báo tồn kho thấp
- Khi tồn kho của sản phẩm giảm xuống mức **`quantity <= min_quantity`**, sản phẩm được coi là sắp hết hàng.
- Danh sách này có thể truy xuất riêng qua API `GET /products/low-stock` hoặc bộ lọc `low_stock=1` tại `GET /products`.

## 4. Idempotency Key (Tránh trùng lặp giao dịch)
- Mọi request tạo biến động kho `POST /products/:id/movements` **bắt buộc** truyền header `Idempotency-Key`.
- **Cơ chế xử lý**:
  - Khi gửi request với key mới: Hệ thống tạo giao dịch biến động mới và trả về mã **201 Created**.
  - Khi gửi lại request với key đã tồn tại trong hệ thống: Hệ thống không tạo thêm giao dịch mới mà trả lại dữ liệu giao dịch cũ kèm mã **200 OK**.

## 5. Sổ cái bất biến (Immutable Ledger)
- Toàn bộ lịch sử biến động kho (`movements`) được lưu trữ dưới dạng sổ cái bất biến: **không hỗ trợ sửa (UPDATE) hoặc xóa (DELETE)**.
- Mọi sự thay đổi về tồn kho sản phẩm phải được thực hiện thông qua việc tạo mới một bản ghi biến động (`movement`).
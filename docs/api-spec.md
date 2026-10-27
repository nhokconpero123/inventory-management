# API Specification

## Danh sách Endpoint

---

### 1. POST /auth/login
* **Method**: `POST`
* **Quyền**: Public
* **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "password123"
  }
  ```
* **Response thành công (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
* **Mã lỗi có thể trả**: `400`, `401`

---

### 2. POST /users
* **Method**: `POST`
* **Quyền**: Admin (Tạo tài khoản staff)
* **Request Body**:
  ```json
  {
    "username": "staff01",
    "password": "password123",
    "role": "staff"
  }
  ```
* **Response thành công (201 Created)**:
  ```json
  {
    "id": 2,
    "username": "staff01",
    "role": "staff",
    "created_at": "2026-10-27T10:00:00Z"
  }
  ```
* **Mã lỗi có thể trả**: `400`, `401`, `403`, `409`

---

### 3. GET /dashboard/summary
* **Method**: `GET`
* **Quyền**: Staff+ (Admin, Staff)
* **Query Parameters**: Không
* **Response thành công (200 OK)**:
  ```json
  {
    "total_products": 150,
    "low_stock_count": 5,
    "recent_movements": [
      {
        "id": 10,
        "product_id": 1,
        "type": "IN",
        "quantity": 20,
        "created_at": "2026-10-27T12:00:00Z"
      }
    ]
  }
  ```
* **Mã lỗi có thể trả**: `401`, `403`

---

### 4. GET /categories
* **Method**: `GET`
* **Quyền**: Staff+
* **Query Parameters**: Không
* **Response thành công (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "name": "Điện thoại"
    }
  ]
  ```
* **Mã lỗi có thể trả**: `401`, `403`

---

### 5. POST /categories
* **Method**: `POST`
* **Quyền**: Admin
* **Request Body**:
  ```json
  {
    "name": "Laptop"
  }
  ```
* **Response thành công (201 Created)**:
  ```json
  {
    "id": 2,
    "name": "Laptop"
  }
  ```
* **Mã lỗi có thể trả**: `400`, `401`, `403`, `409`

---

### 6. GET /products
* **Method**: `GET`
* **Quyền**: Staff+
* **Query Parameters**:
  * `q` (string): Tìm kiếm theo tên
  * `category_id` (number): Lọc theo danh mục
  * `low_stock` (number): `1` để lọc sản phẩm sắp hết
  * `page` (number): Trang hiện tại
  * `limit` (number): Số lượng sản phẩm/trang
* **Response thành công (200 OK)**:
  ```json
  {
    "items": [
      {
        "id": 1,
        "name": "iPhone 15",
        "category_id": 1,
        "quantity": 10,
        "min_quantity": 5
      }
    ],
    "total": 1,
    "page": 1
  }
  ```
* **Mã lỗi có thể trả**: `400`, `401`, `403`

---

### 7. POST /products
* **Method**: `POST`
* **Quyền**: Admin
* **Request Body**:
  ```json
  {
    "name": "MacBook Air",
    "category_id": 2,
    "quantity": 10,
    "min_quantity": 3
  }
  ```
* **Response thành công (201 Created)**:
  ```json
  {
    "id": 5,
    "name": "MacBook Air",
    "category_id": 2,
    "quantity": 10,
    "min_quantity": 3
  }
  ```
* **Mã lỗi có thể trả**: `400`, `401`, `403`

---

### 8. PATCH /products/:id
* **Method**: `PATCH`
* **Quyền**: Admin
* **Lưu ý**: Không hỗ trợ cập nhật trường `quantity`.
* **Request Body**:
  ```json
  {
    "name": "MacBook Air M2",
    "min_quantity": 5
  }
  ```
* **Response thành công (200 OK)**:
  ```json
  {
    "id": 5,
    "name": "MacBook Air M2",
    "category_id": 2,
    "quantity": 10,
    "min_quantity": 5
  }
  ```
* **Mã lỗi có thể trả**: `400`, `401`, `403`, `404`

---

### 9. GET /products/low-stock
* **Method**: `GET`
* **Quyền**: Staff+
* **Query Parameters**: Không
* **Response thành công (200 OK)**:
  ```json
  [
    {
      "id": 2,
      "name": "Chuột không dây",
      "quantity": 2,
      "min_quantity": 5
    }
  ]
  ```
* **Mã lỗi có thể trả**: `401`, `403`

---

### 10. POST /products/:id/movements
* **Method**: `POST`
* **Quyền**: Staff+ (Riêng type `ADJUST` chỉ dành cho Admin)
* **Headers**:
  * `Idempotency-Key` (string, bắt buộc)
* **Request Body**:
  ```json
  {
    "type": "IN",
    "quantity": 5,
    "reason": "Nhập hàng bổ sung"
  }
  ```
* **Response thành công**:
  * **201 Created**: Tạo giao dịch biến động kho mới.
  * **200 OK**: Trùng `Idempotency-Key` (trả về dữ liệu giao dịch cũ).
  ```json
  {
    "id": 101,
    "product_id": 1,
    "type": "IN",
    "quantity": 5,
    "reason": "Nhập hàng bổ sung",
    "created_at": "2026-10-27T13:00:00Z"
  }
  ```
* **Mã lỗi có thể trả**:
  * `400 Bad Request`: Sai dữ liệu đầu vào hoặc thiếu Header `Idempotency-Key`.
  * `401 Unauthorized`: Chưa xác thực.
  * `403 Forbidden`: Quyền `staff` cố gắng thực hiện type `ADJUST`.
  * `404 Not Found`: Không có sản phẩm với `:id` tương ứng.
  * `409 Conflict`: Thiếu tồn kho (khi thực hiện `OUT` hoặc `ADJUST` giảm quá số lượng có sẵn).

---

### 11. GET /products/:id/movements
* **Method**: `GET`
* **Quyền**: Staff+
* **Query Parameters**: Không
* **Response thành công (200 OK)**:
  ```json
  [
    {
      "id": 101,
      "product_id": 1,
      "type": "IN",
      "quantity": 5,
      "reason": "Nhập hàng bổ sung",
      "created_at": "2026-10-27T13:00:00Z"
    }
  ]
  ```
* **Mã lỗi có thể trả**: `401`, `403`, `404`

---

### 12. GET /movements
* **Method**: `GET`
* **Quyền**: Staff+
* **Query Parameters**:
  * `type` (string): Lọc theo loại (`IN`, `OUT`, `ADJUST`)
  * `from` (string): Ngày bắt đầu
  * `to` (string): Ngày kết thúc
  * `page` (number): Số trang
* **Response thành công (200 OK)**:
  ```json
  {
    "items": [
      {
        "id": 101,
        "product_id": 1,
        "type": "IN",
        "quantity": 5,
        "reason": "Nhập hàng bổ sung",
        "created_at": "2026-10-27T13:00:00Z"
      }
    ],
    "total": 1,
    "page": 1
  }
  ```
* **Mã lỗi có thể trả**: `400`, `401`, `403`
# API Specification

## Endpoint List

---

### 1. POST /auth/login
* **Method**: `POST`
* **Access**: Public
* **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "password123"
  }
  ```
* **Successful Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
* **Possible Error Codes**: `400`, `401`

---

### 2. POST /users
* **Method**: `POST`
* **Access**: Admin (create staff accounts)
* **Request Body**:
  ```json
  {
    "username": "staff01",
    "password": "password123",
    "role": "staff"
  }
  ```
* **Successful Response (201 Created)**:
  ```json
  {
    "id": 2,
    "username": "staff01",
    "role": "staff",
    "created_at": "2026-10-27T10:00:00Z"
  }
  ```
* **Possible Error Codes**: `400`, `401`, `403`, `409`

---

### 3. GET /dashboard/summary
* **Method**: `GET`
* **Access**: Staff+ (Admin, Staff)
* **Query Parameters**: None
* **Successful Response (200 OK)**:
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
* **Possible Error Codes**: `401`, `403`

---

### 4. GET /categories
* **Method**: `GET`
* **Access**: Staff+
* **Query Parameters**: None
* **Successful Response (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "name": "Phones"
    }
  ]
  ```
* **Possible Error Codes**: `401`, `403`

---

### 5. POST /categories
* **Method**: `POST`
* **Access**: Admin
* **Request Body**:
  ```json
  {
    "name": "Laptop"
  }
  ```
* **Successful Response (201 Created)**:
  ```json
  {
    "id": 2,
    "name": "Laptop"
  }
  ```
* **Possible Error Codes**: `400`, `401`, `403`, `409`

---

### 6. GET /products
* **Method**: `GET`
* **Access**: Staff+
* **Query Parameters**:
  * `q` (string): Search by name
  * `category_id` (number): Filter by category
  * `low_stock` (number): Set to `1` to filter low-stock products
  * `page` (number): Current page
  * `limit` (number): Number of products per page
* **Successful Response (200 OK)**:
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
* **Possible Error Codes**: `400`, `401`, `403`

---

### 7. POST /products
* **Method**: `POST`
* **Access**: Admin
* **Request Body**:
  ```json
  {
    "name": "MacBook Air",
    "category_id": 2,
    "quantity": 10,
    "min_quantity": 3
  }
  ```
* **Successful Response (201 Created)**:
  ```json
  {
    "id": 5,
    "name": "MacBook Air",
    "category_id": 2,
    "quantity": 10,
    "min_quantity": 3
  }
  ```
* **Possible Error Codes**: `400`, `401`, `403`

---

### 8. PATCH /products/:id
* **Method**: `PATCH`
* **Access**: Admin
* **Note**: Updating the `quantity` field is not supported.
* **Request Body**:
  ```json
  {
    "name": "MacBook Air M2",
    "min_quantity": 5
  }
  ```
* **Successful Response (200 OK)**:
  ```json
  {
    "id": 5,
    "name": "MacBook Air M2",
    "category_id": 2,
    "quantity": 10,
    "min_quantity": 5
  }
  ```
* **Possible Error Codes**: `400`, `401`, `403`, `404`

---

### 9. GET /products/low-stock
* **Method**: `GET`
* **Access**: Staff+
* **Query Parameters**: None
* **Successful Response (200 OK)**:
  ```json
  [
    {
      "id": 2,
      "name": "Wireless mouse",
      "quantity": 2,
      "min_quantity": 5
    }
  ]
  ```
* **Possible Error Codes**: `401`, `403`

---

### 10. POST /products/:id/movements
* **Method**: `POST`
* **Access**: Staff+ (the `ADJUST` type is reserved for Admin)
* **Headers**:
  * `Idempotency-Key` (string, required)
* **Request Body**:
  ```json
  {
    "type": "IN",
    "quantity": 5,
    "reason": "Additional stock received"
  }
  ```
* **Successful Response**:
  * **201 Created**: Creates a new stock movement.
  * **200 OK**: Duplicate `Idempotency-Key` (returns the existing movement).
  ```json
  {
    "id": 101,
    "product_id": 1,
    "type": "IN",
    "quantity": 5,
    "reason": "Additional stock received",
    "created_at": "2026-10-27T13:00:00Z"
  }
  ```
* **Possible Error Codes**:
  * `400 Bad Request`: Invalid input or missing `Idempotency-Key` header.
  * `401 Unauthorized`: Authentication is required.
  * `403 Forbidden`: A `staff` user attempted to submit type `ADJUST`.
  * `404 Not Found`: No product exists for the specified `:id`.
  * `409 Conflict`: Insufficient stock (when `OUT` or `ADJUST` would reduce stock below the available quantity).

---

### 11. GET /products/:id/movements
* **Method**: `GET`
* **Access**: Staff+
* **Query Parameters**: None
* **Successful Response (200 OK)**:
  ```json
  [
    {
      "id": 101,
      "product_id": 1,
      "type": "IN",
      "quantity": 5,
      "reason": "Additional stock received",
      "created_at": "2026-10-27T13:00:00Z"
    }
  ]
  ```
* **Possible Error Codes**: `401`, `403`, `404`

---

### 12. GET /movements
* **Method**: `GET`
* **Access**: Staff+
* **Query Parameters**:
  * `type` (string): Filter by type (`IN`, `OUT`, `ADJUST`)
  * `from` (string): Start date
  * `to` (string): End date
  * `page` (number): Page number
* **Successful Response (200 OK)**:
  ```json
  {
    "items": [
      {
        "id": 101,
        "product_id": 1,
        "type": "IN",
        "quantity": 5,
        "reason": "Additional stock received",
        "created_at": "2026-10-27T13:00:00Z"
      }
    ],
    "total": 1,
    "page": 1
  }
  ```
* **Possible Error Codes**: `400`, `401`, `403`

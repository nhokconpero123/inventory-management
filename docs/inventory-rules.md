# Inventory Rules

## 1. Non-negative stock
- A product's stock quantity (`quantity`) must never be less than 0.
- If a stock-out (`OUT`) or adjustment (`ADJUST`) would reduce stock below 0, the system rejects the transaction and returns **409 Conflict** (insufficient stock).

## 2. Movement Types
- **`IN` (Stock In)**: Increases a product's stock quantity. (Available to: Staff+)
- **`OUT` (Stock Out)**: Decreases a product's stock quantity. (Available to: Staff+)
- **`ADJUST` (Adjustment)**: Increases or decreases stock to match the actual quantity after an inventory count. **Admin only**.

## 3. Low-stock alerts
- A product is considered low on stock when its stock reaches **`quantity <= min_quantity`**.
- This list is available through the `GET /products/low-stock` API or the `low_stock=1` filter on `GET /products`.

## 4. Idempotency Key (Preventing duplicate transactions)
- Every stock movement request, `POST /products/:id/movements`, **must** include the `Idempotency-Key` header.
- **Behavior**:
  - When a request is sent with a new key, the system creates a stock movement and returns **201 Created**.
  - When a request is repeated with a key that already exists, the system does not create another movement; it returns the existing movement data with **200 OK**.

## 5. Immutable Ledger
- All stock movement history (`movements`) is stored as an immutable ledger: **updates (UPDATE) and deletes (DELETE) are not supported**.
- All changes to product stock must be made by creating a new movement record (`movement`).
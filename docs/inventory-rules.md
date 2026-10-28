# Inventory Management Rules

## 1. Stock cannot be negative
- A product's stock quantity (`quantity`) can never be less than 0.
- If stock out (`OUT`) or an adjustment (`ADJUST`) would reduce stock below 0, the system rejects the transaction and returns **409 Conflict** (insufficient stock).

## 2. Movement types
- **`IN` (Stock in)**: Increases a product's stock quantity. (Available to: Staff+)
- **`OUT` (Stock out)**: Decreases a product's stock quantity. (Available to: Staff+)
- **`ADJUST` (Adjust)**: Increases or decreases stock to match the actual quantity after an inventory count. **Only Admin** can perform this action.

## 3. Low-stock alerts
- A product is considered low on stock when its quantity reaches **`quantity <= min_quantity`**.
- This list is available through the `GET /products/low-stock` API or the `low_stock=1` filter on `GET /products`.

## 4. Idempotency key (preventing duplicate transactions)
- Every request that creates a stock movement with `POST /products/:id/movements` **must** include the `Idempotency-Key` header.
- **How it works**:
  - When a request uses a new key, the system creates a stock movement and returns **201 Created**.
  - When a request reuses a key already in the system, the system does not create another movement. It returns the existing movement with **200 OK**.

## 5. Immutable ledger
- All stock movement history (`movements`) is stored in an immutable ledger: **updates (UPDATE) and deletes (DELETE) are not supported**.
- Every change to a product's stock must be made by creating a new movement record (`movement`).

# inventory-management
Inventory management app: React, Express, SQLite, JWT roles

# Inventory Management

Manage products, stock, and low-stock alerts.

**Stack:** React + Vite + Tailwind, Node.js + Express, SQLite, JWT (admin/staff), Vitest + Supertest.

> In development.
# Inventory Management System (IMS)

![CI](https://github.com/nhokconpero123/inventory-management/actions/workflows/ci.yml/badge.svg)

Inventory management system: track stock through a movement ledger, monitor low-stock alerts, and manage admin/staff access.

**Demo:** <https://inventory-management.nhokconpero123.workers.dev/>
**Accounts:** `admin@demo.com` or `staff@demo.com`, password `Demo@12345`


![Dashboard](docs/screenshots/dashboard.png)
![Products](docs/screenshots/products.png)

## Features
- JWT sign-in with two roles: admin and staff
- Manage products and categories; search by name or SKU, filter results, and browse pages
- Stock in (IN), stock out (OUT), and post-count adjustments (ADJUST) with a required reason
- Low-stock alerts when `quantity <= min_quantity`
- Dashboard overview and movement history with type and date filters

## Permissions
| Action | admin | staff |
|---|:---:|:---:|
| View products, categories, history, and dashboard | ✅ | ✅ |
| Stock in and stock out | ✅ | ✅ |
| Adjust stock (ADJUST) | ✅ | ❌ |
| Add/edit products and add categories | ✅ | ❌ |
| Create accounts | ✅ | ❌ |

## Technology
React, Vite, TypeScript, Tailwind, TanStack Query · Node.js, Express, SQLite (better-sqlite3), zod · JWT, bcrypt · Vitest, Supertest · GitHub Actions

## Database
```mermaid
erDiagram
  users ||--o{ stock_movements : "created_by"
  categories ||--o{ products : "category_id"
  products ||--o{ stock_movements : "product_id"
  users {
    int id PK
    text email UK
    text name
    text role
    int is_active
  }
  categories {
    int id PK
    text name UK
  }
  products {
    int id PK
    text sku UK
    text name
    int quantity
    int min_quantity
    int is_active
  }
  stock_movements {
    int id PK
    int product_id FK
    text type
    int quantity_change
    int quantity_after
    text idempotency_key UK
    int created_by FK
  }
```

## Design decisions
- **Immutable ledger:** `stock_movements` is append-only; updates and deletes are blocked by a database trigger. Correct mistakes by creating a compensating movement.
- **Single stock update path:** only `recordMovement()` may change `products.quantity`, within one transaction that also writes to the ledger.
- **Two safeguards against negative stock:** `UPDATE ... WHERE quantity + delta >= 0` in code and `CHECK (quantity >= 0)` in the database.
- **Idempotency-Key:** retrying the same request (after a network failure or double-click) does not deduct stock twice.
- **Concurrency:** SQLite allows only one writer; `IMMEDIATE` transactions and WAL serialize writes.
- **Why SQLite:** it is sufficient for one warehouse and needs no separate server. Queries are contained in the repository layer, so moving to PostgreSQL requires changes only there.
- **Tests:** Supertest tests the API on SQLite `:memory:` through `createApp(db)`, including a reconciliation check for `SUM(quantity_change) = quantity`.

## Run locally (Windows PowerShell)
Node.js 20 or later is required.
```powershell
git clone https://github.com/<tai-khoan>/inventory-management.git
cd inventory-management
npm install
$secret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
Set-Content -Path server/.env -Value "JWT_SECRET=$secret" -Encoding ascii
npm run seed
npm run dev          # API: http://localhost:3000
npm run dev:client   # Web: http://localhost:5173
```
Run tests: `npm test`

## Documentation
- [API](docs/api-spec.md)
- [Inventory rules](docs/inventory-rules.md)

## Known limitations
- Tokens are stored in `sessionStorage` (more exposed to XSS than httpOnly cookies) and remain valid for up to one hour after an account is disabled.
- The UI does not yet support changing passwords or disabling users.
- SQLite is suited to one warehouse and one server. Multiple warehouses or servers require PostgreSQL.
- Category names are case-sensitive.
- Batches/expiry dates, reserved stock, and incoming stock are not supported yet.

## Roadmap
Add batch and expiry tracking, reserved stock, multiple warehouses, PostgreSQL support, and httpOnly cookies for tokens.

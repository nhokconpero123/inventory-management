import bcrypt from 'bcryptjs';
import type Database from 'better-sqlite3';
import { createMovementsRepo } from '../modules/movements/movements.repo';

const CATEGORIES = ['Điện thoại', 'Laptop', 'Phụ kiện'];

// [sku, tên, danh mục, min_quantity, tồn đầu kỳ]
const PRODUCTS: [string, string, string, number, number][] = [
  ['IP15-128', 'iPhone 15 128GB', 'Điện thoại', 5, 24],
  ['IP15P-256', 'iPhone 15 Pro 256GB', 'Điện thoại', 5, 12],
  ['SS-S24', 'Samsung Galaxy S24', 'Điện thoại', 5, 18],
  ['SS-A55', 'Samsung Galaxy A55', 'Điện thoại', 8, 30],
  ['XM-14', 'Xiaomi 14', 'Điện thoại', 5, 9],
  ['OPPO-R11', 'OPPO Reno11', 'Điện thoại', 5, 15],
  ['PX-8', 'Google Pixel 8', 'Điện thoại', 3, 6],
  ['MBA-13', 'MacBook Air 13 M3', 'Laptop', 3, 8],
  ['MBP-14', 'MacBook Pro 14 M3', 'Laptop', 2, 2], // bằng ngưỡng → sắp hết
  ['DELL-XPS13', 'Dell XPS 13', 'Laptop', 3, 7],
  ['LEN-T14', 'Lenovo ThinkPad T14', 'Laptop', 3, 10],
  ['ASUS-VB15', 'ASUS Vivobook 15', 'Laptop', 4, 14],
  ['HP-P15', 'HP Pavilion 15', 'Laptop', 4, 11],
  ['ACER-N16', 'Acer Nitro 16', 'Laptop', 2, 5],
  ['MOUSE-01', 'Chuột không dây', 'Phụ kiện', 10, 4], // dưới ngưỡng → sắp hết
  ['KB-01', 'Bàn phím cơ', 'Phụ kiện', 8, 20],
  ['HDP-01', 'Tai nghe Bluetooth', 'Phụ kiện', 10, 35],
  ['CHG-65W', 'Sạc nhanh 65W', 'Phụ kiện', 15, 60],
  ['CAB-USBC', 'Cáp USB-C 1m', 'Phụ kiện', 20, 80],
  ['HUB-7IN1', 'Hub USB-C 7 cổng', 'Phụ kiện', 6, 3], // dưới ngưỡng → sắp hết
];

/** Tạo dữ liệu demo. Chạy lại nhiều lần vẫn an toàn. */
export function seedDemo(db: Database.Database, password = process.env.SEED_PASSWORD ?? 'Demo@12345') {
  const hash = bcrypt.hashSync(password, 10);

  db.transaction(() => {
    const addUser = db.prepare(
      'INSERT OR IGNORE INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)',
    );
    addUser.run('admin@demo.com', 'Quản trị viên', hash, 'admin');
    addUser.run('staff@demo.com', 'Nhân viên kho', hash, 'staff');

    const addCat = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
    for (const c of CATEGORIES) addCat.run(c);

    const catId = db.prepare('SELECT id FROM categories WHERE name = ?');
    const addProduct = db.prepare(
      'INSERT OR IGNORE INTO products (sku, name, category_id, min_quantity) VALUES (?, ?, ?, ?)',
    );
    for (const [sku, name, cat, min] of PRODUCTS) {
      addProduct.run(sku, name, (catId.get(cat) as { id: number }).id, min);
    }
  })();

  // Tồn đầu kỳ qua recordMovement (đặt ngoài transaction trên vì record tự mở transaction riêng)
  const { record } = createMovementsRepo(db);
  const adminId = (db.prepare("SELECT id FROM users WHERE email = 'admin@demo.com'").get() as { id: number }).id;
  const productId = db.prepare('SELECT id FROM products WHERE sku = ?');
  for (const [sku, , , , qty] of PRODUCTS) {
    const id = (productId.get(sku) as { id: number }).id;
    record({ productId: id, type: 'IN', quantity: qty, reason: 'Tồn đầu kỳ (seed)', key: `seed-${sku}`, userId: adminId });
  }
}
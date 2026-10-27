import bcrypt from 'bcryptjs';
import type Database from 'better-sqlite3';

const CATEGORIES = ['Điện thoại', 'Laptop', 'Phụ kiện'];

// [sku, tên, danh mục, min_quantity]
const PRODUCTS: [string, string, string, number][] = [
  ['IP15-128', 'iPhone 15 128GB', 'Điện thoại', 5],
  ['IP15P-256', 'iPhone 15 Pro 256GB', 'Điện thoại', 5],
  ['SS-S24', 'Samsung Galaxy S24', 'Điện thoại', 5],
  ['SS-A55', 'Samsung Galaxy A55', 'Điện thoại', 8],
  ['XM-14', 'Xiaomi 14', 'Điện thoại', 5],
  ['OPPO-R11', 'OPPO Reno11', 'Điện thoại', 5],
  ['PX-8', 'Google Pixel 8', 'Điện thoại', 3],
  ['MBA-13', 'MacBook Air 13 M3', 'Laptop', 3],
  ['MBP-14', 'MacBook Pro 14 M3', 'Laptop', 2],
  ['DELL-XPS13', 'Dell XPS 13', 'Laptop', 3],
  ['LEN-T14', 'Lenovo ThinkPad T14', 'Laptop', 3],
  ['ASUS-VB15', 'ASUS Vivobook 15', 'Laptop', 4],
  ['HP-P15', 'HP Pavilion 15', 'Laptop', 4],
  ['ACER-N16', 'Acer Nitro 16', 'Laptop', 2],
  ['MOUSE-01', 'Chuột không dây', 'Phụ kiện', 10],
  ['KB-01', 'Bàn phím cơ', 'Phụ kiện', 8],
  ['HDP-01', 'Tai nghe Bluetooth', 'Phụ kiện', 10],
  ['CHG-65W', 'Sạc nhanh 65W', 'Phụ kiện', 15],
  ['CAB-USBC', 'Cáp USB-C 1m', 'Phụ kiện', 20],
  ['HUB-7IN1', 'Hub USB-C 7 cổng', 'Phụ kiện', 6],
];

/** Tạo dữ liệu demo. Chạy lại nhiều lần vẫn an toàn (INSERT OR IGNORE). */
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
}
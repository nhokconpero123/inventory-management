import bcrypt from 'bcryptjs';
import type Database from 'better-sqlite3';
import { createMovementsRepo } from '../modules/movements/movements.repo';

const CATEGORIES = ['Phones', 'Laptops', 'Accessories'];

// [sku, name, category, min_quantity, opening stock]
const PRODUCTS: [string, string, string, number, number][] = [
  ['IP15-128', 'iPhone 15 128GB', 'Phones', 5, 24],
  ['IP15P-256', 'iPhone 15 Pro 256GB', 'Phones', 5, 12],
  ['SS-S24', 'Samsung Galaxy S24', 'Phones', 5, 18],
  ['SS-A55', 'Samsung Galaxy A55', 'Phones', 8, 30],
  ['XM-14', 'Xiaomi 14', 'Phones', 5, 9],
  ['OPPO-R11', 'OPPO Reno11', 'Phones', 5, 15],
  ['PX-8', 'Google Pixel 8', 'Phones', 3, 6],
  ['MBA-13', 'MacBook Air 13 M3', 'Laptops', 3, 8],
  ['MBP-14', 'MacBook Pro 14 M3', 'Laptops', 2, 2], // At threshold: low stock.
  ['DELL-XPS13', 'Dell XPS 13', 'Laptops', 3, 7],
  ['LEN-T14', 'Lenovo ThinkPad T14', 'Laptops', 3, 10],
  ['ASUS-VB15', 'ASUS Vivobook 15', 'Laptops', 4, 14],
  ['HP-P15', 'HP Pavilion 15', 'Laptops', 4, 11],
  ['ACER-N16', 'Acer Nitro 16', 'Laptops', 2, 5],
  ['MOUSE-01', 'Wireless Mouse', 'Accessories', 10, 4], // Below threshold: low stock.
  ['KB-01', 'Mechanical Keyboard', 'Accessories', 8, 20],
  ['HDP-01', 'Bluetooth Headphones', 'Accessories', 10, 35],
  ['CHG-65W', '65W Fast Charger', 'Accessories', 15, 60],
  ['CAB-USBC', '1m USB-C Cable', 'Accessories', 20, 80],
  ['HUB-7IN1', '7-in-1 USB-C Hub', 'Accessories', 6, 3], // Below threshold: low stock.
];

/** Creates demo data. Safe to run repeatedly. */
export function seedDemo(db: Database.Database, password = process.env.SEED_PASSWORD ?? 'Demo@12345') {
  const hash = bcrypt.hashSync(password, 10);

  db.transaction(() => {
    const addUser = db.prepare(
      'INSERT OR IGNORE INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)',
    );
    addUser.run('admin@demo.com', 'Administrator', hash, 'admin');
    addUser.run('staff@demo.com', 'Warehouse Staff', hash, 'staff');

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

  // Record opening stock through recordMovement, outside the transaction above because record opens its own transaction.
  const { record } = createMovementsRepo(db);
  const adminId = (db.prepare("SELECT id FROM users WHERE email = 'admin@demo.com'").get() as { id: number }).id;
  const productId = db.prepare('SELECT id FROM products WHERE sku = ?');
  for (const [sku, , , , qty] of PRODUCTS) {
    const id = (productId.get(sku) as { id: number }).id;
    record({ productId: id, type: 'IN', quantity: qty, reason: 'Opening stock (seed)', key: `seed-${sku}`, userId: adminId });
  }
}
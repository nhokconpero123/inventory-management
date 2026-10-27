import 'dotenv/config';
import { openDb, applySchema } from './db/connection';
import { seedDemo } from './db/seedData';
import { createApp } from './app';
import { jwtSecret } from './config';

jwtSecret(); // báo lỗi ngay lúc khởi động nếu thiếu JWT_SECRET

const db = openDb();
const hasTables = db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'users'").get();
if (!hasTables) applySchema(db);

// Demo: ổ đĩa của host miễn phí bị xóa khi khởi động lại → tự tạo dữ liệu mẫu nếu DB trống
if (process.env.AUTO_SEED === '1') {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
  if (n === 0) {
    seedDemo(db);
    console.log('Đã tạo dữ liệu demo (AUTO_SEED=1)');
  }
}

const port = Number(process.env.PORT ?? 3000);
createApp(db).listen(port, () => console.log(`API ready on http://localhost:${port}`));
import 'dotenv/config';
import { openDb, applySchema } from './db/connection';
import { createApp } from './app';
import { jwtSecret } from './config';

jwtSecret(); // báo lỗi ngay lúc khởi động nếu thiếu JWT_SECRET

const db = openDb();
const hasTables = db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'users'").get();
if (!hasTables) applySchema(db);

const port = Number(process.env.PORT ?? 3000);
createApp(db).listen(port, () => console.log(`API ready on http://localhost:${port}`));
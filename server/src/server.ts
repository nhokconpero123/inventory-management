import { openDb, applySchema } from './db/connection';
import { createApp } from './app';

const db = openDb();

// DB trống (lần chạy đầu) thì tạo bảng
const hasTables = db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'users'").get();
if (!hasTables) applySchema(db);

const port = Number(process.env.PORT ?? 3000);
createApp(db).listen(port, () => console.log(`API ready on http://localhost:${port}`));
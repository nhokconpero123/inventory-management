import 'dotenv/config';
import { openDb, applySchema } from './connection';
import { seedDemo } from './seedData';

const db = openDb();
if (!db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'users'").get()) applySchema(db);
seedDemo(db);
console.log('Seed xong: admin@demo.com và staff@demo.com');
import 'dotenv/config';
import { openDb, applySchema } from './db/connection';
import { seedDemo } from './db/seedData';
import { createApp } from './app';
import { jwtSecret } from './config';

jwtSecret(); // Fail immediately at startup if JWT_SECRET is missing.

const db = openDb();
const hasTables = db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'users'").get();
if (!hasTables) applySchema(db);

// Demo: free-host disks are cleared on restart, so create sample data when the database is empty.
if (process.env.AUTO_SEED === '1') {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
  if (n === 0) {
    seedDemo(db);
    console.log('Demo data created (AUTO_SEED=1)');
  }
}

const port = Number(process.env.PORT ?? 3000);
createApp(db).listen(port, () => console.log(`API ready on http://localhost:${port}`));

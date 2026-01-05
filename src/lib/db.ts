import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'deals.db');
const db = new Database(dbPath);

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    departureDate TEXT NOT NULL,
    returnDate TEXT NOT NULL,
    price REAL NOT NULL,
    currency TEXT NOT NULL,
    foundAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    skyscannerLink TEXT
  );
  
  CREATE INDEX IF NOT EXISTS idx_dates ON deals(departureDate);
`);

export default db;

import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export const getDb = () => {
  if (!db) {
    const sqlite = openDatabaseSync('school-management-system.db');
    db = drizzle(sqlite, { schema });
  }
  return db;
};

export const initDb = async () => {
  const database = getDb();

  // Create tables if they don't exist
  try {
    await database.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)');
  } catch (error) {
    console.error('Error creating tables:', error);
  }

  return database;
};

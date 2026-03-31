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
    await database.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, avatar TEXT, timezone TEXT DEFAULT "UTC", language TEXT DEFAULT "en", notifications INTEGER DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)');
    
    await database.run('CREATE TABLE IF NOT EXISTS schools (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, description TEXT, code TEXT NOT NULL UNIQUE, address TEXT UNIQUE, owner_name TEXT, phone TEXT, email TEXT, logo TEXT, created_by INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)');
    
    await database.run('CREATE TABLE IF NOT EXISTS user_schools (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, school_id INTEGER NOT NULL, role TEXT NOT NULL DEFAULT "member", joined_at TEXT NOT NULL, UNIQUE(user_id, school_id))');

    await database.run('CREATE TABLE IF NOT EXISTS roles (id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT "STANDARD", permissions TEXT DEFAULT "{}", created_at TEXT NOT NULL, updated_at TEXT NOT NULL)');

    await database.run('CREATE TABLE IF NOT EXISTS modules (id INTEGER PRIMARY KEY AUTOINCREMENT, school_id INTEGER NOT NULL, key TEXT NOT NULL, name TEXT NOT NULL, icon TEXT NOT NULL, fields TEXT NOT NULL DEFAULT "[]", display_order INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)');

    // Migration: Add new columns if they don't exist
    const migrations = [
      'ALTER TABLE users ADD COLUMN avatar TEXT',
      'ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT "UTC"',
      'ALTER TABLE users ADD COLUMN language TEXT DEFAULT "en"',
      'ALTER TABLE users ADD COLUMN notifications INTEGER DEFAULT 1',
      'ALTER TABLE schools ADD COLUMN address TEXT UNIQUE',
      'ALTER TABLE schools ADD COLUMN owner_name TEXT',
      'ALTER TABLE schools ADD COLUMN phone TEXT',
      'ALTER TABLE schools ADD COLUMN email TEXT',
      'ALTER TABLE schools ADD COLUMN logo TEXT',
    ];
    for (const migration of migrations) {
      try {
        await database.run(migration);
      } catch (e) {
        // Column already exists, ignore
      }
    }
  } catch (error) {
    console.error('Error creating tables:', error);
  }

  return database;
};

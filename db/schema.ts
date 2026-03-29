import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  avatar: text('avatar'),
  timezone: text('timezone').$defaultFn(() => 'UTC'),
  language: text('language').$defaultFn(() => 'en'),
  notifications: integer('notifications', { mode: 'boolean' }).$defaultFn(() => true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const schools = sqliteTable('schools', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  code: text('code').notNull().unique(),
  address: text('address').unique(),
  ownerName: text('owner_name'),
  phone: text('phone'),
  email: text('email'),
  logo: text('logo'),
  createdBy: integer('created_by').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const userSchools = sqliteTable('user_schools', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  schoolId: integer('school_id').notNull(),
  role: text('role').notNull().$defaultFn(() => 'member'),
  joinedAt: text('joined_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type School = typeof schools.$inferSelect;
export type NewSchool = typeof schools.$inferInsert;

export const roles = sqliteTable('roles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull().$defaultFn(() => 'STANDARD'), // 'FULL ACCESS' | 'STANDARD'
  permissions: text('permissions').$defaultFn(() => '{}'), // JSON string of permissions
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export type UserSchool = typeof userSchools.$inferSelect;
export type NewUserSchool = typeof userSchools.$inferInsert;

export const modules = sqliteTable('modules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull(),
  key: text('key').notNull(),             // e.g. 'quick_access'
  name: text('name').notNull(),            // e.g. 'Quick Access'
  icon: text('icon').notNull(),            // Ionicons name e.g. 'flash'
  fields: text('fields').notNull().$defaultFn(() => '[]'), // JSON array of field names
  displayOrder: integer('display_order').notNull().$defaultFn(() => 0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().$defaultFn(() => true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type Module = typeof modules.$inferSelect;
export type NewModule = typeof modules.$inferInsert;

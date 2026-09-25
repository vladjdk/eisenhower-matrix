import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const tasks=sqliteTable('tasks',{id:text('id').primaryKey(),title:text('title').notNull(),notes:text('notes').notNull().default(''),q:integer('q').notNull(),x:real('x').notNull(),y:real('y').notNull(),done:integer('done').notNull().default(0),due:text('due').notNull().default(''),sources:text('sources').notNull().default('[]'),links:text('links').notNull().default('[]')});
export const boardMeta=sqliteTable('board_meta',{id:text('id').primaryKey()});

import {integer,sqliteTable,text,index} from 'drizzle-orm/sqlite-core';
export const players=sqliteTable('players',{id:text('id').primaryKey(),state:text('state').notNull(),revision:integer('revision').notNull().default(0),updatedAt:integer('updated_at').notNull()});
export const rankings=sqliteTable('rankings',{id:text('id').primaryKey(),snapshot:text('snapshot').notNull(),rating:integer('rating').notNull().default(1000),power:integer('power').notNull(),updatedAt:integer('updated_at').notNull()},t=>[index('rankings_rating_idx').on(t.rating)]);

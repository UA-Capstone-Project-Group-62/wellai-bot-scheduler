import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { logger } from './logger.js';
import { env } from './env.js';
import * as schema from '../db/schema.js';

const pool = new Pool({
	connectionString: env.DATABASE_URL,
});

pool.on('error', (err: Error) => {
	logger.error({ err }, 'Unexpected error on idle client');
});

export const db = drizzle({
	client: pool,
	schema,
	logger: env.NODE_ENV !== 'production',
});

export async function closeDbPool(): Promise<void> {
	await pool.end();
	logger.info('Database pool closed');
}
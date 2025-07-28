import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const __filename: string = fileURLToPath(import.meta.url);
export const __dirname: string = dirname(__filename);

export const STATIC_PATH: string = join(__dirname, '../assets');
export const DEFAULT_DEV_HOST = '0.0.0.0';

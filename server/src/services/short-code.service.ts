import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

const CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // 30 chars, no 0/O/1/I/L
const CODE_LENGTH = 6;
const MAX_RETRIES = 5;

export function generateShortCode(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARSET[bytes[i] % CHARSET.length];
  }
  return code;
}

export async function generateUniqueShortCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = generateShortCode();
    const existing = await prisma.table.findUnique({
      where: { short_code: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error('Failed to generate a unique short code after max retries');
}

export function normalizeShortCode(input: string): string {
  return input.toUpperCase().replace(/[\s\-]/g, '');
}

const VALID_CODE_RE = new RegExp(`^[${CHARSET}]{${CODE_LENGTH}}$`);

export function isValidShortCodeFormat(code: string): boolean {
  return VALID_CODE_RE.test(code);
}

import crypto from 'crypto';

const SHORT_CODE_CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const SHORT_CODE_LENGTH = 6;

export function generateShortCode(): string {
  const bytes = crypto.randomBytes(SHORT_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < SHORT_CODE_LENGTH; i++) {
    code += SHORT_CODE_CHARSET[bytes[i] % SHORT_CODE_CHARSET.length];
  }
  return code;
}

/**
 * Generate a QR token using HMAC-SHA256.
 *
 * Payload format: "storeId:tableId:version"
 * Returns: base64url encoded "{payload}.{signature}"
 *
 * This mirrors the implementation in server/src/services/qr.service.ts
 * so the seed data produces tokens that the runtime can verify.
 */
export function generateQrToken(
  storeId: string,
  tableId: string,
  version: number,
): string {
  const secret = process.env.QR_HMAC_SECRET;
  if (!secret) {
    throw new Error(
      'QR_HMAC_SECRET is not set. Please ensure your .env file is loaded before calling generateQrToken.',
    );
  }

  const payload = `${storeId}:${tableId}:${version}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  const token = Buffer.from(`${payload}.${signature}`).toString('base64url');
  return token;
}

import crypto from 'crypto';
import { AppError } from '../lib/errors.js';

function getHmacSecret(): string {
  const secret = process.env.QR_HMAC_SECRET;
  if (!secret) {
    throw AppError.internal('QR_HMAC_SECRET is not configured');
  }
  return secret;
}

/**
 * Generate a QR token using HMAC-SHA256.
 * Payload format: "storeId:tableId:version"
 * Returns: base64url encoded "{payload}.{signature}"
 */
export function generateQrToken(
  tableId: string,
  storeId: string,
  version: number
): string {
  const secret = getHmacSecret();
  const payload = `${storeId}:${tableId}:${version}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  const token = Buffer.from(`${payload}.${signature}`).toString('base64url');
  return token;
}

/**
 * Verify a QR token.
 * Decodes the base64url token, extracts payload and signature,
 * verifies HMAC, returns parsed data.
 */
export function verifyQrToken(token: string): {
  store_id: string;
  table_id: string;
  version: number;
} {
  const secret = getHmacSecret();

  let decoded: string;
  try {
    decoded = Buffer.from(token, 'base64url').toString('utf-8');
  } catch {
    throw AppError.badRequest('Invalid QR token encoding', 'INVALID_QR_TOKEN');
  }

  const dotIndex = decoded.lastIndexOf('.');
  if (dotIndex === -1) {
    throw AppError.badRequest('Invalid QR token format', 'INVALID_QR_TOKEN');
  }

  const payload = decoded.substring(0, dotIndex);
  const signature = decoded.substring(dotIndex + 1);

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  if (!crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )) {
    throw AppError.badRequest('Invalid QR token signature', 'INVALID_QR_TOKEN');
  }

  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw AppError.badRequest('Invalid QR token payload', 'INVALID_QR_TOKEN');
  }

  const [storeId, tableId, versionStr] = parts;
  const version = parseInt(versionStr, 10);
  if (isNaN(version)) {
    throw AppError.badRequest('Invalid QR token version', 'INVALID_QR_TOKEN');
  }

  return {
    store_id: storeId,
    table_id: tableId,
    version,
  };
}

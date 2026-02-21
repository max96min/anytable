import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw AppError.internal('JWT_SECRET is not configured');
  }
  return secret;
}

function generateTokens(systemAdminId: string) {
  const secret = getJwtSecret();

  const accessToken = jwt.sign(
    { system_admin_id: systemAdminId, type: 'system_access' },
    secret,
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  );

  const refreshToken = jwt.sign(
    { system_admin_id: systemAdminId, type: 'system_refresh' },
    secret,
    { expiresIn: REFRESH_TOKEN_EXPIRY },
  );

  return { accessToken, refreshToken };
}

export async function login(email: string, password: string) {
  const admin = await prisma.systemAdmin.findUnique({ where: { email } });

  if (!admin) {
    throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const passwordValid = await bcrypt.compare(password, admin.password_hash);
  if (!passwordValid) {
    throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const { accessToken, refreshToken } = generateTokens(admin.id);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
    },
  };
}

export async function refreshToken(token: string) {
  const secret = getJwtSecret();

  let decoded: jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, secret) as jwt.JwtPayload;
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }

  if (decoded.type !== 'system_refresh') {
    throw AppError.unauthorized('Invalid token type', 'INVALID_TOKEN_TYPE');
  }

  const admin = await prisma.systemAdmin.findUnique({
    where: { id: decoded.system_admin_id },
  });

  if (!admin) {
    throw AppError.unauthorized('Admin not found', 'ADMIN_NOT_FOUND');
  }

  const tokens = generateTokens(admin.id);

  return {
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
    },
  };
}

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw AppError.internal('JWT_SECRET is not configured');
  }
  return secret;
}

function generateTokens(ownerId: string, storeId: string) {
  const secret = getJwtSecret();

  const accessToken = jwt.sign(
    { owner_id: ownerId, store_id: storeId, type: 'access' },
    secret,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { owner_id: ownerId, store_id: storeId, type: 'refresh' },
    secret,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
}

export async function login(email: string, password: string) {
  const owner = await prisma.owner.findUnique({
    where: { email },
    include: { stores: { select: { id: true }, take: 1 } },
  });

  if (!owner) {
    throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const passwordValid = await bcrypt.compare(password, owner.password_hash);
  if (!passwordValid) {
    throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (!owner.is_active) {
    throw AppError.forbidden('Account has been deactivated', 'ACCOUNT_DEACTIVATED');
  }

  const storeId = owner.stores[0]?.id;
  if (!storeId) {
    throw AppError.internal('Owner has no associated store');
  }

  const { accessToken, refreshToken } = generateTokens(owner.id, storeId);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    owner: {
      id: owner.id,
      email: owner.email,
      name: owner.name,
      store_id: storeId,
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

  if (decoded.type !== 'refresh') {
    throw AppError.unauthorized('Invalid token type', 'INVALID_TOKEN_TYPE');
  }

  const owner = await prisma.owner.findUnique({
    where: { id: decoded.owner_id },
    include: { stores: { select: { id: true }, take: 1 } },
  });

  if (!owner) {
    throw AppError.unauthorized('Owner not found', 'OWNER_NOT_FOUND');
  }

  const storeId = owner.stores[0]?.id ?? decoded.store_id;
  const tokens = generateTokens(owner.id, storeId);

  return {
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  };
}

export async function register(
  email: string,
  password: string,
  name: string,
  storeName: string
) {
  const existing = await prisma.owner.findUnique({ where: { email } });
  if (existing) {
    throw AppError.conflict('Email already registered', 'EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const owner = await prisma.owner.create({
    data: {
      email,
      password_hash: passwordHash,
      name,
      stores: {
        create: {
          name: storeName,
          settings: {
            order_confirm_mode: 'ANYONE',
            session_ttl_minutes: 120,
            allow_additional_orders: true,
            tax_rate: 0.1,
            service_charge_rate: 0,
            tax_included: true,
            currency: 'KRW',
          },
        },
      },
    },
    include: { stores: { select: { id: true }, take: 1 } },
  });

  const storeId = owner.stores[0].id;
  const { accessToken, refreshToken: refresh } = generateTokens(owner.id, storeId);

  return {
    access_token: accessToken,
    refresh_token: refresh,
    owner: {
      id: owner.id,
      email: owner.email,
      name: owner.name,
      store_id: storeId,
    },
  };
}

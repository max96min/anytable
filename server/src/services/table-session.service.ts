import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { verifyQrToken } from './qr.service.js';
import type { StoreSettings } from '@anytable/shared';

const AVATAR_COLORS = [
  '#e68119', '#e6194B', '#3cb44b', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
];

function hashFingerprint(fingerprint: string): string {
  return crypto.createHash('sha256').update(fingerprint).digest('hex');
}

function generateSessionToken(sessionId: string, participantId: string): string {
  return `session:${sessionId}:participant:${participantId}`;
}

export async function joinSession(
  qrToken: string,
  nickname: string,
  deviceFingerprint: string,
  language: string = 'en'
) {
  // 1. Verify the QR token
  const { store_id, table_id, version } = verifyQrToken(qrToken);

  // 2. Verify table exists and QR version matches
  const table = await prisma.table.findUnique({
    where: { id: table_id },
  });

  if (!table) {
    throw AppError.notFound('Table not found', 'TABLE_NOT_FOUND');
  }

  if (table.store_id !== store_id) {
    throw AppError.badRequest('QR token does not match store', 'QR_STORE_MISMATCH');
  }

  if (table.qr_token_version !== version) {
    throw AppError.badRequest('QR code has been regenerated. Please scan the new code.', 'QR_VERSION_MISMATCH');
  }

  if (table.status !== 'ACTIVE') {
    throw AppError.badRequest('This table is currently inactive', 'TABLE_INACTIVE');
  }

  // 3. Get store with settings
  const store = await prisma.store.findUnique({
    where: { id: store_id },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      default_language: true,
      supported_languages: true,
      settings: true,
    },
  });

  if (!store) {
    throw AppError.notFound('Store not found', 'STORE_NOT_FOUND');
  }

  const settings = store.settings as unknown as StoreSettings;
  const sessionTtlMinutes = settings?.session_ttl_minutes ?? 120;

  const fingerprintHash = hashFingerprint(deviceFingerprint);

  // 4. Find or create session + participant in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Find existing OPEN session for this table
    let session = await tx.tableSession.findFirst({
      where: {
        table_id: table_id,
        status: 'OPEN',
      },
    });

    let isNewSession = false;

    if (!session) {
      // Create new session
      const expiresAt = new Date(Date.now() + sessionTtlMinutes * 60 * 1000);
      session = await tx.tableSession.create({
        data: {
          store_id,
          table_id,
          status: 'OPEN',
          current_round_no: 0,
          participants_count: 0,
          expires_at: expiresAt,
        },
      });
      isNewSession = true;
    }

    // Check if participant already exists (by device fingerprint)
    let participant = await tx.participant.findFirst({
      where: {
        session_id: session.id,
        device_fingerprint_hash: fingerprintHash,
        is_active: true,
      },
    });

    if (participant) {
      // Update last seen and potentially nickname/language
      participant = await tx.participant.update({
        where: { id: participant.id },
        data: {
          nickname,
          language,
          last_seen_at: new Date(),
        },
      });
    } else {
      // Determine role: first participant is HOST
      const role = isNewSession ? 'HOST' : 'GUEST';
      const avatarColor = AVATAR_COLORS[session.participants_count % AVATAR_COLORS.length];

      participant = await tx.participant.create({
        data: {
          session_id: session.id,
          nickname,
          device_fingerprint_hash: fingerprintHash,
          role,
          avatar_color: avatarColor,
          language,
        },
      });

      // Update session participant count and host if first
      const updateData: Record<string, unknown> = {
        participants_count: { increment: 1 },
        last_activity_at: new Date(),
      };
      if (role === 'HOST') {
        updateData.host_participant_id = participant.id;
      }

      session = await tx.tableSession.update({
        where: { id: session.id },
        data: updateData,
      });
    }

    // Ensure SharedCart exists
    let cart = await tx.sharedCart.findUnique({
      where: { session_id: session.id },
    });

    if (!cart) {
      cart = await tx.sharedCart.create({
        data: {
          session_id: session.id,
          version: 1,
        },
      });
    }

    return { session, participant, cart };
  });

  const sessionToken = generateSessionToken(result.session.id, result.participant.id);

  // Get table number for the response
  return {
    session: {
      id: result.session.id,
      store_id: result.session.store_id,
      table_id: result.session.table_id,
      table_number: table.table_number,
      status: result.session.status as 'OPEN' | 'CLOSED' | 'EXPIRED',
      current_round_no: result.session.current_round_no,
      participants_count: result.session.participants_count,
      created_at: result.session.created_at.toISOString(),
    },
    participant: {
      id: result.participant.id,
      session_id: result.participant.session_id,
      nickname: result.participant.nickname,
      role: result.participant.role as 'HOST' | 'GUEST',
      joined_at: result.participant.joined_at.toISOString(),
      avatar_color: result.participant.avatar_color,
    },
    session_token: sessionToken,
    store: {
      id: store.id,
      name: store.name,
      address: store.address ?? undefined,
      phone: store.phone ?? undefined,
      default_language: store.default_language,
      supported_languages: store.supported_languages,
      settings: store.settings,
    },
    cart_id: result.cart.id,
  };
}

export async function getSession(sessionId: string) {
  const session = await prisma.tableSession.findUnique({
    where: { id: sessionId },
    include: {
      table: { select: { table_number: true } },
    },
  });

  if (!session) {
    throw AppError.notFound('Session not found');
  }

  return {
    id: session.id,
    store_id: session.store_id,
    table_id: session.table_id,
    table_number: session.table.table_number,
    status: session.status,
    current_round_no: session.current_round_no,
    participants_count: session.participants_count,
    created_at: session.created_at.toISOString(),
  };
}

export async function getParticipants(sessionId: string) {
  const session = await prisma.tableSession.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });

  if (!session) {
    throw AppError.notFound('Session not found');
  }

  const participants = await prisma.participant.findMany({
    where: { session_id: sessionId, is_active: true },
    select: {
      id: true,
      session_id: true,
      nickname: true,
      role: true,
      joined_at: true,
      avatar_color: true,
    },
    orderBy: { joined_at: 'asc' },
  });

  return participants.map((p) => ({
    ...p,
    joined_at: p.joined_at.toISOString(),
  }));
}

export async function closeSession(sessionId: string) {
  const session = await prisma.tableSession.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true },
  });

  if (!session) {
    throw AppError.notFound('Session not found');
  }

  if (session.status !== 'OPEN') {
    throw AppError.badRequest('Session is not open', 'SESSION_NOT_OPEN');
  }

  const updated = await prisma.tableSession.update({
    where: { id: sessionId },
    data: {
      status: 'CLOSED',
      closed_at: new Date(),
    },
  });

  return updated;
}

export async function expireSessions() {
  const now = new Date();

  const result = await prisma.tableSession.updateMany({
    where: {
      status: 'OPEN',
      expires_at: { lte: now },
    },
    data: {
      status: 'EXPIRED',
      closed_at: now,
    },
  });

  return result.count;
}

export async function getActiveSessions(storeId: string, options: {
  status?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const { status = 'OPEN', limit = 50, offset = 0 } = options;

  const [sessions, total] = await Promise.all([
    prisma.tableSession.findMany({
      where: {
        store_id: storeId,
        status,
      },
      include: {
        table: { select: { table_number: true, label: true } },
        participants: {
          where: { is_active: true },
          select: { id: true, nickname: true, role: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.tableSession.count({
      where: {
        store_id: storeId,
        status,
      },
    }),
  ]);

  return { sessions, total };
}

import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import type {
  StoreSettings,
  SelectedOption,
  OrderItemSnapshot,
  OrderDTO,
} from '@anytable/shared';

export async function placeOrder(
  sessionId: string,
  participantId: string,
  cartVersion: number,
  idempotencyKey: string
): Promise<OrderDTO> {
  // Check idempotency first
  const existingOrder = await prisma.order.findUnique({
    where: { idempotency_key: idempotencyKey },
    include: {
      table: { select: { table_number: true } },
    },
  });

  if (existingOrder) {
    return formatOrder(existingOrder);
  }

  const order = await prisma.$transaction(async (tx) => {
    // Get session with table info
    const session = await tx.tableSession.findUnique({
      where: { id: sessionId },
      include: {
        table: { select: { id: true, table_number: true } },
        store: { select: { id: true, settings: true } },
      },
    });

    if (!session) {
      throw AppError.notFound('Session not found');
    }

    if (session.status !== 'OPEN') {
      throw AppError.badRequest('Session is no longer active', 'SESSION_NOT_OPEN');
    }

    // Verify participant
    const participant = await tx.participant.findFirst({
      where: { id: participantId, session_id: sessionId, is_active: true },
      select: { id: true },
    });

    if (!participant) {
      throw AppError.forbidden('Participant not found or inactive');
    }

    // Get the shared cart
    const cart = await tx.sharedCart.findUnique({
      where: { session_id: sessionId },
      include: {
        items: {
          include: {
            menu: {
              select: {
                id: true,
                locales: true,
                base_price: true,
              },
            },
            participant: {
              select: { nickname: true },
            },
          },
        },
      },
    });

    if (!cart) {
      throw AppError.notFound('Cart not found');
    }

    // Optimistic lock check on cart version
    if (cart.version !== cartVersion) {
      throw AppError.conflict(
        'Cart has been modified. Please review changes before ordering.',
        'CART_VERSION_MISMATCH'
      );
    }

    if (cart.items.length === 0) {
      throw AppError.badRequest('Cart is empty', 'CART_EMPTY');
    }

    // Snapshot cart items
    const items: OrderItemSnapshot[] = cart.items.map((item) => {
      const menuLocales = item.menu.locales as Record<string, { name: string; description?: string }>;
      const localeKeys = Object.keys(menuLocales);
      const defaultName = localeKeys.length > 0 ? menuLocales[localeKeys[0]].name : 'Unknown';
      const secondaryName = localeKeys.length > 1 ? menuLocales[localeKeys[1]].name : undefined;

      return {
        menu_id: item.menu_id,
        menu_name: defaultName,
        menu_name_secondary: secondaryName,
        quantity: item.quantity,
        unit_price: item.unit_price,
        selected_options: item.selected_options as unknown as SelectedOption[],
        item_total: item.unit_price * item.quantity,
        status: 'PLACED' as const,
      };
    });

    // Compute totals
    const settings = session.store.settings as unknown as StoreSettings;
    const taxRate = settings?.tax_rate ?? 0;
    const serviceChargeRate = settings?.service_charge_rate ?? 0;
    const taxIncluded = settings?.tax_included ?? true;

    const subtotal = items.reduce((sum, item) => sum + item.item_total, 0);

    let tax: number;
    let serviceCharge: number;
    let grandTotal: number;

    if (taxIncluded) {
      tax = Math.round(subtotal - subtotal / (1 + taxRate));
      serviceCharge = Math.round(subtotal * serviceChargeRate);
      grandTotal = subtotal + serviceCharge;
    } else {
      tax = Math.round(subtotal * taxRate);
      serviceCharge = Math.round(subtotal * serviceChargeRate);
      grandTotal = subtotal + tax + serviceCharge;
    }

    // Increment round number
    const updatedSession = await tx.tableSession.update({
      where: { id: sessionId },
      data: {
        current_round_no: { increment: 1 },
        last_activity_at: new Date(),
      },
    });

    const roundNo = updatedSession.current_round_no;

    // Create order
    const newOrder = await tx.order.create({
      data: {
        store_id: session.store.id,
        table_id: session.table.id,
        session_id: sessionId,
        round_no: roundNo,
        status: 'PLACED',
        items: items as unknown as object,
        subtotal,
        tax,
        service_charge: serviceCharge,
        grand_total: grandTotal,
        idempotency_key: idempotencyKey,
      },
      include: {
        table: { select: { table_number: true } },
      },
    });

    // Clear cart items and increment cart version
    await tx.cartItem.deleteMany({ where: { cart_id: cart.id } });
    await tx.sharedCart.update({
      where: { id: cart.id },
      data: {
        version: { increment: 1 },
        updated_at: new Date(),
      },
    });

    return newOrder;
  });

  return formatOrder(order);
}

export async function getOrders(sessionId: string): Promise<OrderDTO[]> {
  const orders = await prisma.order.findMany({
    where: { session_id: sessionId },
    include: {
      table: { select: { table_number: true } },
    },
    orderBy: { placed_at: 'desc' },
  });

  return orders.map(formatOrder);
}

export async function getOrdersByStore(
  storeId: string,
  filters: {
    status?: string;
    table_id?: string;
    session_id?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { status, table_id, session_id, limit = 50, offset = 0 } = filters;

  const where: Record<string, unknown> = { store_id: storeId };
  if (status) where.status = status;
  if (table_id) where.table_id = table_id;
  if (session_id) where.session_id = session_id;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        table: { select: { table_number: true } },
      },
      orderBy: { placed_at: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders: orders.map(formatOrder),
    total,
  };
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  storeId?: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, store_id: true, status: true },
  });

  if (!order) {
    throw AppError.notFound('Order not found');
  }

  if (storeId && order.store_id !== storeId) {
    throw AppError.forbidden('Order does not belong to your store');
  }

  // Validate status transition
  const validTransitions: Record<string, string[]> = {
    PLACED: ['ACCEPTED', 'CANCELLED'],
    ACCEPTED: ['PREPARING', 'CANCELLED'],
    PREPARING: ['READY', 'CANCELLED'],
    READY: ['SERVED'],
    SERVED: [],
    CANCELLED: [],
  };

  const allowed = validTransitions[order.status] ?? [];
  if (!allowed.includes(status)) {
    throw AppError.badRequest(
      `Cannot transition from ${order.status} to ${status}`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: {
      table: { select: { table_number: true } },
    },
  });

  return formatOrder(updated);
}

function formatOrder(order: {
  id: string;
  store_id: string;
  table_id: string;
  session_id: string;
  round_no: number;
  status: string;
  items: unknown;
  subtotal: number;
  tax: number;
  service_charge: number;
  grand_total: number;
  placed_at: Date;
  updated_at: Date;
  table: { table_number: number };
}): OrderDTO {
  return {
    id: order.id,
    store_id: order.store_id,
    table_id: order.table_id,
    session_id: order.session_id,
    table_number: order.table.table_number,
    round_no: order.round_no,
    status: order.status as OrderDTO['status'],
    items: order.items as OrderItemSnapshot[],
    subtotal: order.subtotal,
    tax: order.tax,
    service_charge: order.service_charge,
    grand_total: order.grand_total,
    placed_at: order.placed_at.toISOString(),
    updated_at: order.updated_at.toISOString(),
  };
}

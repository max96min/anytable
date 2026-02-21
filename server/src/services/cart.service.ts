import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import type { StoreSettings, SelectedOption, SharedCartDTO, CartItemDTO } from '@anytable/shared';

export async function getCart(sessionId: string): Promise<SharedCartDTO> {
  const cart = await prisma.sharedCart.findUnique({
    where: { session_id: sessionId },
    include: {
      items: {
        include: {
          menu: {
            select: {
              id: true,
              locales: true,
              image_url: true,
              base_price: true,
            },
          },
          participant: {
            select: {
              id: true,
              nickname: true,
              avatar_color: true,
            },
          },
        },
        orderBy: { created_at: 'asc' },
      },
      session: {
        select: {
          store: {
            select: { settings: true },
          },
        },
      },
    },
  });

  if (!cart) {
    throw AppError.notFound('Cart not found for this session', 'CART_NOT_FOUND');
  }

  const settings = cart.session.store.settings as unknown as StoreSettings;

  const items: CartItemDTO[] = cart.items.map((item) => {
    const menuLocales = item.menu.locales as Record<string, { name: string }>;
    const defaultName = Object.values(menuLocales)[0]?.name ?? 'Unknown';

    return {
      id: item.id,
      menu_id: item.menu_id,
      menu_name: defaultName,
      menu_image: item.menu.image_url ?? undefined,
      participant_id: item.participant.id,
      participant_nickname: item.participant.nickname,
      participant_avatar_color: item.participant.avatar_color,
      quantity: item.quantity,
      unit_price: item.unit_price,
      selected_options: item.selected_options as unknown as SelectedOption[],
      item_total: item.unit_price * item.quantity,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.item_total, 0);
  const taxRate = settings?.tax_rate ?? 0;
  const serviceChargeRate = settings?.service_charge_rate ?? 0;
  const taxIncluded = settings?.tax_included ?? true;

  let tax: number;
  let serviceCharge: number;
  let grandTotal: number;

  if (taxIncluded) {
    // Tax is already included in prices
    tax = Math.round(subtotal - subtotal / (1 + taxRate));
    serviceCharge = Math.round(subtotal * serviceChargeRate);
    grandTotal = subtotal + serviceCharge;
  } else {
    tax = Math.round(subtotal * taxRate);
    serviceCharge = Math.round(subtotal * serviceChargeRate);
    grandTotal = subtotal + tax + serviceCharge;
  }

  return {
    id: cart.id,
    session_id: cart.session_id,
    version: cart.version,
    items,
    subtotal,
    tax,
    service_charge: serviceCharge,
    grand_total: grandTotal,
    updated_at: cart.updated_at.toISOString(),
  };
}

export async function getCartById(cartId: string): Promise<SharedCartDTO> {
  const cart = await prisma.sharedCart.findUnique({
    where: { id: cartId },
    select: { session_id: true },
  });

  if (!cart) {
    throw AppError.notFound('Cart not found', 'CART_NOT_FOUND');
  }

  return getCart(cart.session_id);
}

export async function mutateCart(
  cartId: string,
  mutation: {
    action: 'ADD' | 'UPDATE' | 'REMOVE';
    cart_version: number;
    participant_id: string;
    item_id?: string;
    menu_id?: string;
    quantity?: number;
    selected_options?: SelectedOption[];
  }
): Promise<SharedCartDTO> {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Find cart and check version (optimistic lock)
    const cart = await tx.sharedCart.findUnique({
      where: { id: cartId },
      select: { id: true, version: true, session_id: true },
    });

    if (!cart) {
      throw AppError.notFound('Cart not found', 'CART_NOT_FOUND');
    }

    // OPTIMISTIC LOCK: check version matches
    if (cart.version !== mutation.cart_version) {
      // Fetch latest cart state to include in 409 response
      const latestCart = await getCart(cart.session_id);
      throw AppError.conflict(
        'Cart has been modified by another participant. Please refresh.',
        'CART_VERSION_MISMATCH',
        { latest_cart: latestCart }
      );
    }

    switch (mutation.action) {
      case 'ADD': {
        if (!mutation.menu_id) {
          throw AppError.badRequest('menu_id is required for ADD action');
        }

        // Get menu item to compute unit_price
        const menu = await tx.menu.findUnique({
          where: { id: mutation.menu_id },
          select: { id: true, base_price: true, is_sold_out: true },
        });

        if (!menu) {
          throw AppError.notFound('Menu item not found');
        }

        if (menu.is_sold_out) {
          throw AppError.badRequest('This item is sold out', 'ITEM_SOLD_OUT');
        }

        // Compute unit_price = base_price + sum of option price_deltas
        const selectedOptions = mutation.selected_options ?? [];
        const optionsDelta = selectedOptions.reduce(
          (sum, opt) => sum + opt.price_delta,
          0
        );
        const unitPrice = menu.base_price + optionsDelta;

        await tx.cartItem.create({
          data: {
            cart_id: cartId,
            menu_id: mutation.menu_id,
            participant_id: mutation.participant_id,
            quantity: mutation.quantity ?? 1,
            selected_options: selectedOptions as unknown as object,
            unit_price: unitPrice,
          },
        });
        break;
      }

      case 'UPDATE': {
        if (!mutation.item_id) {
          throw AppError.badRequest('item_id is required for UPDATE action');
        }

        const existingItem = await tx.cartItem.findUnique({
          where: { id: mutation.item_id },
          select: { id: true, cart_id: true, menu_id: true },
        });

        if (!existingItem || existingItem.cart_id !== cartId) {
          throw AppError.notFound('Cart item not found');
        }

        const updateData: Record<string, unknown> = {};

        if (mutation.quantity !== undefined) {
          updateData.quantity = mutation.quantity;
        }

        if (mutation.selected_options !== undefined) {
          // Recompute unit_price if options changed
          const menuItem = await tx.menu.findUnique({
            where: { id: existingItem.menu_id },
            select: { base_price: true },
          });
          if (!menuItem) {
            throw AppError.notFound('Menu item not found');
          }

          const optionsDelta = mutation.selected_options.reduce(
            (sum, opt) => sum + opt.price_delta,
            0
          );
          updateData.unit_price = menuItem.base_price + optionsDelta;
          updateData.selected_options = mutation.selected_options as unknown as object;
        }

        await tx.cartItem.update({
          where: { id: mutation.item_id },
          data: updateData,
        });
        break;
      }

      case 'REMOVE': {
        if (!mutation.item_id) {
          throw AppError.badRequest('item_id is required for REMOVE action');
        }

        const itemToRemove = await tx.cartItem.findUnique({
          where: { id: mutation.item_id },
          select: { id: true, cart_id: true },
        });

        if (!itemToRemove || itemToRemove.cart_id !== cartId) {
          throw AppError.notFound('Cart item not found');
        }

        await tx.cartItem.delete({
          where: { id: mutation.item_id },
        });
        break;
      }

      default:
        throw AppError.badRequest('Invalid cart action');
    }

    // 2. Increment cart version
    await tx.sharedCart.update({
      where: { id: cartId },
      data: {
        version: { increment: 1 },
        updated_at: new Date(),
      },
    });

    return cart.session_id;
  });

  // 3. Return fresh cart state
  return getCart(result);
}

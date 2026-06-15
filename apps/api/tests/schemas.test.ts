import { describe, expect, it } from 'vitest';
import {
  CartItemInput,
  CreateOrderRequest,
  FulfillmentMethod,
  OrderStatus,
  PaymentStatus,
  QuoteCartRequest,
  UpdateShopSettingsRequest,
} from '../../packages/shared/src/index';

describe('shared zod schemas', () => {
  it('CreateOrderRequest rejects delivery without address', () => {
    const parsed = CreateOrderRequest.safeParse({
      items: [{ menuItemId: '11111111-1111-1111-1111-111111111111', quantity: 1 }],
      fulfillment: 'delivery',
      customer: { name: 'A', email: 'a@b.co', phone: '08123' },
    });
    expect(parsed.success).toBe(false);
  });

  it('CreateOrderRequest accepts delivery with address', () => {
    const parsed = CreateOrderRequest.safeParse({
      items: [{ menuItemId: '11111111-1111-1111-1111-111111111111', quantity: 1 }],
      fulfillment: 'delivery',
      customer: { name: 'A', email: 'a@b.co', phone: '081234567890', address: 'Jl Sudirman 1' },
    });
    if (!parsed.success) console.error(parsed.error.issues);
    expect(parsed.success).toBe(true);
  });

  it('QuoteCartRequest rejects empty items', () => {
    const parsed = QuoteCartRequest.safeParse({ items: [], fulfillment: 'pickup' });
    expect(parsed.success).toBe(false);
  });

  it('UpdateShopSettingsRequest rejects empty patch', () => {
    const parsed = UpdateShopSettingsRequest.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it('enums export the right values', () => {
    expect(FulfillmentMethod.options).toEqual(['pickup', 'delivery']);
    expect(OrderStatus.options).toContain('queued');
    expect(PaymentStatus.options).toContain('paid');
  });

  it('CartItemInput requires positive quantity', () => {
    expect(
      CartItemInput.safeParse({ menuItemId: '11111111-1111-1111-1111-111111111111', quantity: 0 })
        .success,
    ).toBe(false);
    expect(
      CartItemInput.safeParse({ menuItemId: '11111111-1111-1111-1111-111111111111', quantity: 1 })
        .success,
    ).toBe(true);
  });
});

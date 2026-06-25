/**
 * Maison Croûte — Client-Side Shopping Cart (Zustand)
 *
 * A Zustand store that holds the customer's cart state in the browser.
 * Everything here lives on the client: the cart is not synced to the API
 * until the customer places an order on the checkout page.
 *
 * Architecture decisions:
 * — Zustand with the `persist` middleware keeps the cart alive across page
 *   refreshes and browser restarts. The cart is stored in localStorage under
 *   the key `cookies-cart-v1`.
 * — Each cart line captures the cookie's name, unit price, and image URL
 *   at the moment it was added. We deliberately snapshot this data rather
 *   than looking it up from the menu later, because the menu can change
 *   (prices update, items get retired) while the cart is open.
 * — The `fulfillment` field tracks whether the customer wants pickup or
 *   delivery. This affects the quote (delivery adds a fee) and is persisted
 *   alongside the cart items.
 */

'use client';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * A single line in the shopping cart, representing one cookie variety the
 * customer wants to order.
 *
 * All fields except `menuItemId` and `quantity` are captured from the menu
 * at add-time. This means if the admin later changes a cookie's price or name,
 * the cart still reflects what the customer saw when they added it — the
 * final price is validated server-side during order placement anyway.
 */
export type CartLine = {
  /** The cookie's ID from the database (used for deduplication and order placement). */
  menuItemId: string;
  /** The cookie's display name (e.g. "Double Chocolate Chip"). */
  name: string;
  /** The unit price in Rupiah at the time the item was added to the cart. */
  unitPrice: number;
  /** How many of this cookie the customer wants. */
  quantity: number;
  /** URL of the cookie's photo, or null if none was uploaded. */
  imageUrl: string | null;
};

/**
 * The shape of the Zustand cart store, combining data and actions.
 *
 * The `lines` array and `fulfillment` string are the persisted state.
 * The five functions (add, setQuantity, remove, clear, setFulfillment)
 * are actions — they're not persisted directly but they update the state.
 */
type CartState = {
  lines: CartLine[];
  /** How the customer wants to receive their order: 'pickup' (default) or 'delivery'. */
  fulfillment: 'pickup' | 'delivery';

  /**
   * Adds a cookie to the cart (upsert logic).
   *
   * If the cookie is already in the cart, the provided quantity is added
   * to the existing quantity. If not already present, a new line is appended.
   * The `quantity` parameter defaults to 1, so `add({ ...line })` is a
   * convenient "add one" shortcut.
   */
  add: (line: Omit<CartLine, 'quantity'> & { quantity?: number }) => void;

  /**
   * Sets an exact quantity for a cart line.
   *
   * If the quantity is 0 or negative, the line is removed from the cart
   * entirely (cleaner UX than showing "0" items). Otherwise the line's
   * quantity is updated in place.
   */
  setQuantity: (menuItemId: string, quantity: number) => void;

  /** Removes a cookie from the cart by its menu item ID. */
  remove: (menuItemId: string) => void;

  /** Empties the entire cart (used after successful order placement). */
  clear: () => void;

  /** Switches between 'pickup' and 'delivery' fulfillment methods. */
  setFulfillment: (f: 'pickup' | 'delivery') => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      fulfillment: 'pickup',

      add: (line) =>
        set((state) => {
          // Check if this cookie is already in the cart.
          const existing = state.lines.find((l) => l.menuItemId === line.menuItemId);
          if (existing) {
            // Already there: increment the quantity on the matching line,
            // leaving all other lines unchanged.
            return {
              lines: state.lines.map((l) =>
                l.menuItemId === line.menuItemId
                  ? { ...l, quantity: l.quantity + (line.quantity ?? 1) }
                  : l,
              ),
            };
          }
          // New item: append a fresh line with the given quantity (default 1).
          return { lines: [...state.lines, { ...line, quantity: line.quantity ?? 1 }] };
        }),

      setQuantity: (menuItemId, quantity) =>
        set((state) => ({
          lines:
            // A quantity of 0 (or negative, from a misbehaving input) means
            // "remove this item". Otherwise update the line's quantity in place.
            quantity <= 0
              ? state.lines.filter((l) => l.menuItemId !== menuItemId)
              : state.lines.map((l) =>
                  l.menuItemId === menuItemId ? { ...l, quantity } : l,
                ),
        })),

      remove: (menuItemId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.menuItemId !== menuItemId) })),

      clear: () => set({ lines: [] }),

      setFulfillment: (f) => set({ fulfillment: f }),
    }),
    {
      /**
       * The localStorage key. The "-v1" suffix allows us to bump the key
       * in the future if the cart shape changes, preventing stale data
       * from breaking the app.
       */
      name: 'cookies-cart-v1',
      /** Store cart data in the browser's localStorage for persistence across sessions. */
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

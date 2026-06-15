'use client';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type CartLine = {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
};

type CartState = {
  lines: CartLine[];
  fulfillment: 'pickup' | 'delivery';
  add: (line: Omit<CartLine, 'quantity'> & { quantity?: number }) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  remove: (menuItemId: string) => void;
  clear: () => void;
  setFulfillment: (f: 'pickup' | 'delivery') => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      fulfillment: 'pickup',
      add: (line) =>
        set((state) => {
          const existing = state.lines.find((l) => l.menuItemId === line.menuItemId);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.menuItemId === line.menuItemId
                  ? { ...l, quantity: l.quantity + (line.quantity ?? 1) }
                  : l,
              ),
            };
          }
          return { lines: [...state.lines, { ...line, quantity: line.quantity ?? 1 }] };
        }),
      setQuantity: (menuItemId, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.menuItemId !== menuItemId)
              : state.lines.map((l) => (l.menuItemId === menuItemId ? { ...l, quantity } : l)),
        })),
      remove: (menuItemId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.menuItemId !== menuItemId) })),
      clear: () => set({ lines: [] }),
      setFulfillment: (f) => set({ fulfillment: f }),
    }),
    {
      name: 'cookies-cart-v1',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/**
 * @cookies/shared ― Barrel Export
 *
 * This is the single entry-point for the `@cookies/shared` package.
 * It re-exports every schema module so consumers (the Hono API and the
 * Next.js frontend) can import with clean paths like:
 *
 *   import { Order, CreateOrderRequest } from '@cookies/shared';
 *
 * All Zod schemas, inferred TypeScript types, and domain enums flow
 * through this file, making it the API contract surface for the entire
 * Maison Croûte cookie e-commerce application.
 */
export * from './enums';
export * from './menu';
export * from './order';
export * from './shop';
export * from './admin';
export * from './common';

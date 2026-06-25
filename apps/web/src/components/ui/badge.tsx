/**
 * Badge
 *
 * Shadcn-style badge component with class-variance-authority (cva)
 * variants. Used throughout the admin dashboard for status indicators:
 * order statuses in the orders table, payment status, menu item
 * visibility, and other label contexts.
 *
 * Variants: default, secondary, outline, success, warning, danger, info.
 *
 * This component follows the shadcn/ui pattern: pure HTML elements
 * with Tailwind CSS classes orchestrated by `cva`.
 */
import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import type * as React from 'react';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border text-foreground',
        success: 'border-transparent bg-sage-200 text-sage-800',
        warning: 'border-transparent bg-cream-300 text-cocoa-800',
        danger: 'border-transparent bg-rose-200 text-rose-800',
        info: 'border-transparent bg-cream-200 text-cocoa-700',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

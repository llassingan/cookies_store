/**
 * Input
 *
 * Shadcn-style text input component. A styled HTML `<input>` element
 * with Tailwind CSS for consistent form styling across the application.
 * Supports all native input types (text, number, password, etc).
 *
 * Used in admin login form, settings form, and menu item forms.
 *
 * This component follows the shadcn/ui pattern: pure HTML elements
 * with Tailwind CSS facades. No Radix primitives needed.
 */
import { cn } from '@/lib/utils';
import * as React from 'react';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };

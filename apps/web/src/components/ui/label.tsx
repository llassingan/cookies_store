/**
 * Label
 *
 * Shadcn-style label component wrapping Radix UI's Label primitive.
 * Provides accessible form labels with the `htmlFor` / `for` attribute
 * automatically wired through Radix's `asChild` pattern.
 *
 * Used alongside Input, Select, Switch, and Textarea components
 * throughout the admin dashboard forms.
 *
 * This component follows the shadcn/ui pattern: Radix primitives
 * (`@radix-ui/react-label`) + Tailwind CSS.
 *
 * @requires 'use client' — Radix Label relies on browser APIs.
 */
'use client';
import { cn } from '@/lib/utils';
import * as LabelPrimitive from '@radix-ui/react-label';
import * as React from 'react';

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('text-sm font-medium leading-none tracking-wide text-foreground/80', className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };

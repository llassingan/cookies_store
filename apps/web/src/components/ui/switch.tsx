/**
 * Toggle Switch
 *
 * Shadcn-style toggle switch component wrapping Radix UI's Switch
 * primitive. Renders an accessible on/off toggle with a sliding thumb,
 * focus ring, and smooth CSS transitions.
 *
 * Used in the admin dashboard for:
 * - Menu item availability toggle (Live / Hidden)
 * - Shop open/close master toggle in settings
 * - Menu item "Available" switch in create/edit dialogs
 *
 * This component follows the shadcn/ui pattern: Radix primitives
 * (`@radix-ui/react-switch`) + Tailwind CSS.
 *
 * @requires 'use client' — Radix Switch relies on browser APIs.
 */
'use client';
import { cn } from '@/lib/utils';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import * as React from 'react';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none block h-4 w-4 rounded-full bg-card shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0',
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };

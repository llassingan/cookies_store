/**
 * Textarea
 *
 * Shadcn-style textarea component. A styled HTML `<textarea>` element
 * with Tailwind CSS for multi-line text input. Matches the Input
 * component's visual style for consistent form presentation.
 *
 * Used in the admin menu form for the cookie description field, which
 * supports up to 2000 characters of flavor and ingredient notes.
 *
 * This component follows the shadcn/ui pattern: pure HTML elements
 * with Tailwind CSS facades. No Radix primitives needed.
 */
import { cn } from '@/lib/utils';
import * as React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export { Textarea };

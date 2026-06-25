/**
 * Admin Login Form (Client Component)
 *
 * Handles admin authentication for the Maison Croûte Studio.
 *
 * **Form validation** uses zod with react-hook-form: both username and
 * password are required (min 1 character). Validation runs on submit.
 *
 * **Error handling** displays server-rejected messages both as inline
 * text below the form and as toast notifications via Sonner. Network
 * failures are caught and surfaced similarly.
 *
 * **Redirect on success**: after a 200 OK from `/api/auth/login`, the
 * browser is redirected to `/admin` and the Next.js router cache is
 * refreshed so the layout picks up the new session cookie on the next
 * render.
 *
 * The dev defaults hint (`admin / admin1234`) is shown below the button
 * as a convenience for local development.
 *
 * @module admin/login-form
 */
'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

// Zod schema for login form validation.
// Both fields are string and require at least 1 character.
const Schema = z.object({
  username: z.string().min(1, 'Required'),
  password: z.string().min(1, 'Required'),
});
type FormValues = z.infer<typeof Schema>;

export function LoginForm() {
  const router = useRouter();
  // Controls the disabled state of the submit button during the request.
  const [submitting, setSubmitting] = useState(false);
  // Holds inline error message shown above the form.
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    // Clear any previous error before attempting sign-in.
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      // Non-2xx response: try to extract the server's error message.
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        const message = data?.error?.message ?? 'Sign in failed';
        setError(message);
        toast.error(message);
        return;
      }
      // Success: notify, then redirect to the admin dashboard.
      toast.success('Welcome back');
      router.replace('/admin');
      // Refresh router cache so the server layout sees the new session cookie.
      router.refresh();
    } catch (e) {
      // Network or parsing error: surface a generic message.
      const message = e instanceof Error ? e.message : 'Sign in failed';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="username">Username</Label>
        <Input id="username" autoComplete="username" {...form.register('username')} />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...form.register('password')}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </Button>
      <p className="text-xs text-muted-foreground">Dev defaults: admin / admin1234</p>
    </form>
  );
}

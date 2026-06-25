/**
 * Admin Sign-In Page (Server Component)
 *
 * The authentication entry point for the Maison Croûte admin Studio.
 * Renders a centered card containing the login form.
 *
 * This page itself is not server-gated (it's a public route within the
 * admin area), but the login form POSTs to `/api/auth/login`, which
 * sets the `cookies_admin_session` HTTP-only JWT cookie on success.
 * After a successful sign-in, the user is redirected to `/admin`,
 * where the layout's `getMe()` call picks up the new session.
 */
import { LoginForm } from './login-form';

export const metadata = { title: 'Sign in · Studio' };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="font-display text-3xl tracking-tight">Studio sign-in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Manage today’s batch, tomorrow’s queue, and last week’s sales.
      </p>
      <div className="mt-6 rounded-lg border border-border/60 bg-card p-6 shadow-sm">
        <LoginForm />
      </div>
    </div>
  );
}

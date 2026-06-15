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

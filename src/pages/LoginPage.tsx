import { useMemo, useState, type FormEvent } from 'react';

import { useAuth } from '../features/auth/useAuth';
import { cn } from '../lib/utils';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button, buttonVariants } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const DEMO_USERS = [
  { role: 'MDRRMO Admin', email: 'admin@reqnnect.com', password: 'password123', icon: '[A]' },
  { role: 'Barangay Official', email: 'official@reqnnect.com', password: 'password123', icon: '[B]' },
  { role: 'Rescuer', email: 'rescuer@reqnnect.com', password: 'password123', icon: '[R]' },
  { role: 'Household', email: 'user@reqnnect.com', password: 'password123', icon: '[H]' },
];

export function LoginPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectPath = useMemo(() => {
    const historyState = window.history.state as { usr?: { from?: unknown } } | null;
    const from = historyState?.usr?.from;
    if (typeof from === 'string' && from.startsWith('/')) {
      return from;
    }

    return '/app';
  }, []);

  if (auth.status === 'authenticated') {
    window.location.replace(redirectPath);
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    const error = await auth.signInWithPassword({ email, password });
    if (error) {
      setSubmitError(error);
    }

    setIsSubmitting(false);
  }

  return (
    <div className="landing-bg flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <Card className="w-full max-w-md border-border/70 bg-card/92 shadow-card backdrop-blur">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Sign In</CardTitle>
          <CardDescription>Supabase auth bootstrap with role/profile resolution.</CardDescription>
        </CardHeader>
        <CardContent>
          {!auth.isConfigured ? (
            <Alert variant="warning" className="mb-4">
              <AlertDescription>
                Missing environment keys: <strong>{auth.missingEnvKeys.join(', ')}</strong>
              </AlertDescription>
            </Alert>
          ) : null}

          {!auth.isConfigured && email.endsWith('@reqnnect.com') ? (
            <Alert className="mb-4 border-primary/30 bg-primary/10 text-primary">
              <AlertDescription>
                <strong>Demo Mode Active:</strong> Sign in is enabled.
              </AlertDescription>
            </Alert>
          ) : null}

          {auth.errorMessage ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{auth.errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          {submitError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                required
                placeholder="name@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                required
                placeholder="Your password"
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-8 border-t border-border pt-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Demo Accounts</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DEMO_USERS.map((user) => (
                <button
                  key={user.role}
                  type="button"
                  onClick={() => {
                    setEmail(user.email);
                    setPassword(user.password);
                  }}
                  className="flex flex-col items-start rounded-md border border-border bg-muted/40 p-2 text-left transition hover:border-primary/40 hover:bg-primary/10"
                >
                  <span className="text-sm font-semibold text-foreground">
                    {user.icon} {user.role}
                  </span>
                  <span className="w-full truncate text-[10px] text-muted-foreground">{user.email}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <a href="/" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
              Back to Landing
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

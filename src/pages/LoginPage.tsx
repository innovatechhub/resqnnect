import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';

import { useAuth } from '../features/auth/useAuth';
import brandLogo from '../assets/logo.png';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';

const roleHints = [
  { label: 'MDRRMO Admin', color: 'bg-rose-100 text-rose-800', note: 'Municipality operations' },
  { label: 'Barangay Official', color: 'bg-blue-100 text-blue-800', note: 'Barangay management' },
  { label: 'Rescuer', color: 'bg-amber-100 text-amber-800', note: 'Field operations' },
  { label: 'Household', color: 'bg-emerald-100 text-emerald-800', note: 'Rescue requests & QR' },
] as const;

export function LoginPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (auth.status === 'authenticated') {
    window.location.replace('/app');
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);
    const error = await auth.signInWithPassword({ email, password });
    if (error) setSubmitError(error);
    setIsSubmitting(false);
  }

  return (
    <div className="landing-bg flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="flex w-full max-w-3xl flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">

        {/* Left: system context */}
        <div className="hidden flex-1 space-y-5 lg:block">
          <div className="flex items-center gap-3">
            <img src={brandLogo} alt="ResQnnect logo" className="h-12 w-auto" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Barbaza Emergency Platform</p>
              <h1 className="font-display text-2xl font-bold text-foreground">ResQnnect</h1>
            </div>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Real-time calamity rescue operation and evacuee monitoring system for the Municipality of Barbaza, Antique.
          </p>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System Roles</p>
            {roleHints.map((role) => (
              <div key={role.label} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/80 px-3 py-2 backdrop-blur">
                <Badge className={`shrink-0 rounded-full text-xs font-semibold ${role.color}`}>
                  {role.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{role.note}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Secured with role-based access control
          </div>
        </div>

        {/* Right: login form */}
        <div className="w-full lg:max-w-sm">
          <Card className="border-border/70 bg-card/92 shadow-card backdrop-blur">
            <CardHeader className="items-center text-center">
              <img src={brandLogo} alt="ResQnnect logo" className="mb-1 h-12 w-auto lg:hidden" />
              <CardTitle className="font-display text-xl">Sign In</CardTitle>
              <p className="text-xs text-muted-foreground">Enter your credentials to access the system</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {!auth.isConfigured ? (
                <Alert variant="warning">
                  <AlertDescription>
                    {auth.missingEnvKeys.length > 0 ? (
                      <>Missing environment keys: <strong>{auth.missingEnvKeys.join(', ')}</strong></>
                    ) : (
                      auth.envIssues.join(' ')
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}

              {auth.errorMessage ? (
                <Alert variant="destructive">
                  <AlertDescription>{auth.errorMessage}</AlertDescription>
                </Alert>
              ) : null}

              {submitError ? (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              ) : null}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
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
                  <div className="relative">
                    <Input
                      id="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      placeholder="Your password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((previous) => !previous)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                <Button type="submit" disabled={isSubmitting || !auth.isConfigured} className="w-full">
                  {isSubmitting ? 'Signing in…' : 'Sign In'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  ClipboardList,
  MapPinned,
  PackageCheck,
  QrCode,
  Siren,
  UsersRound,
  ShieldCheck,
  Radio,
} from 'lucide-react';

import { buttonVariants } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import brandLogo from '../assets/logo.png';
import { cn } from '../lib/utils';

const features = [
  {
    icon: UsersRound,
    title: 'Household Registry',
    description: 'Register all households with QR codes, geolocations, and family member profiles for accurate tracking.',
  },
  {
    icon: Siren,
    title: 'Rescue Requests',
    description: 'Households submit emergency requests with severity level, people count, and GPS location.',
  },
  {
    icon: ClipboardList,
    title: 'Rescue Operations',
    description: 'MDRRMO assigns and dispatches rescue teams. Rescuers update mission status in the field.',
  },
  {
    icon: MapPinned,
    title: 'Live Tracking',
    description: 'Real-time GPS tracking of rescuers and active missions on a municipality-wide map.',
  },
  {
    icon: QrCode,
    title: 'Evacuee Verification',
    description: 'QR code scanning for accurate evacuee identification and check-in at evacuation centers.',
  },
  {
    icon: PackageCheck,
    title: 'Relief Distribution',
    description: 'Manage relief inventory per center and track distribution to verified households.',
  },
  {
    icon: Building2,
    title: 'Evacuation Centers',
    description: 'Monitor center capacity, occupancy, and evacuee records across all barangays.',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description: 'Operational reports on rescue missions, evacuee status, and relief distribution with CSV export.',
  },
] as const;

const roles = [
  {
    label: 'MDRRMO Admin',
    color: 'bg-rose-100 text-rose-800',
    description: 'Municipality-wide oversight: mission dispatch, evacuation monitoring, resource allocation.',
  },
  {
    label: 'Barangay Official',
    color: 'bg-blue-100 text-blue-800',
    description: 'Household registration, rescue coordination, evacuee verification, relief management.',
  },
  {
    label: 'Rescuer',
    color: 'bg-amber-100 text-amber-800',
    description: 'View assigned missions, update status in the field, and publish live GPS location.',
  },
  {
    label: 'Household',
    color: 'bg-emerald-100 text-emerald-800',
    description: 'Submit rescue requests, access QR profile, and view evacuation center availability.',
  },
] as const;

export function LandingPage() {
  return (
    <main className="landing-bg min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">

        {/* Hero */}
        <section className="flex min-h-[60vh] flex-col justify-center gap-6 pb-10">
          <div className="flex items-center gap-3 animate-fade-in">
            <img src={brandLogo} alt="ResQnnect logo" className="h-14 w-auto drop-shadow-md" />
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Barbaza Emergency Platform</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-800">Live</span>
                </span>
              </div>
              <h1 className="font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl">ResQnnect</h1>
            </div>
          </div>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Real-time calamity rescue operation and evacuee monitoring system for the Municipality of Barbaza, Antique.
            Coordinating MDRRMO, barangays, rescuers, and residents during disaster response.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/app" className={buttonVariants({ variant: 'default', size: 'lg' })}>
              Open Dashboard
            </Link>
            <Link to="/login" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Sign In
            </Link>
            <div className="flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur hover:bg-card transition-colors">
              <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
              Real-time operations
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="space-y-4 pb-10">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Core Capabilities</p>
            <h2 className="font-display text-xl font-bold text-foreground">Everything for disaster response</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-border/70 bg-card/90 shadow-sm backdrop-blur transition-all hover:shadow-lg hover:-translate-y-1 duration-300 cursor-default group">
                  <CardContent className="p-4">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="mb-1 text-sm font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Role Breakdown */}
        <section className="space-y-4 pb-10">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Access Levels</p>
            <h2 className="font-display text-xl font-bold text-foreground">Four coordinated roles</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((role) => (
              <Card key={role.label} className="border-border/70 bg-card/90 shadow-sm backdrop-blur transition-all hover:shadow-md duration-300 group">
                <CardContent className="p-4">
                  <Badge className={cn('mb-3 rounded-full text-xs font-semibold group-hover:shadow-sm transition-shadow', role.color)}>
                    {role.label}
                  </Badge>
                  <p className="text-xs leading-relaxed text-muted-foreground group-hover:text-foreground/80 transition-colors">{role.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Footer CTA */}
        <section className="rounded-xl border border-border/70 bg-card/90 p-6 text-center shadow-sm backdrop-blur">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h2 className="mb-1 font-display text-lg font-bold text-foreground">
            Municipality of Barbaza, Antique
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Serving MDRRMO, barangay officials, rescuers, and registered households.
          </p>
          <Link to="/login" className={buttonVariants({ variant: 'default' })}>
            Sign In to Your Account
          </Link>
        </section>
      </div>
    </main>
  );
}

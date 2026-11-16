import { Link } from 'react-router-dom';
import { Camera, MapPin, Building2, Shield, LineChart, Smartphone } from 'lucide-react';

const features = [
  { icon: Camera, title: 'AI-Powered Classification', desc: 'Automatically categorize issues using advanced image recognition technology' },
  { icon: MapPin, title: 'Real-time Tracking', desc: 'Track issue status and location updates in real-time with precise GPS' },
  { icon: Building2, title: 'Direct Department Routing', desc: 'Complaints route straight to the designated municipal wing for quick action' },
  { icon: Shield, title: 'Duplicate & Spoof Protection', desc: 'Smart algorithms filter duplicate tickets and verify authentic on-site photos' },
  { icon: LineChart, title: 'Analytics Dashboard', desc: 'Comprehensive insights for government authorities to track resolution velocity' },
  { icon: Smartphone, title: 'Mobile-First Design', desc: 'Optimized for mobile devices with responsive camera and GPS interaction' },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
              Smart Civic Issue Reporting{' '}
              <span className="bg-gradient-to-r from-brand-light to-brand bg-clip-text text-transparent">
                Made Simple
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              Report neighborhood issues directly to your municipal corporation. Automated photo verification,
              direct department dispatch, and transparent resolution tracking.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/report"
                className="rounded-lg bg-gradient-to-r from-brand to-brand-dark px-6 py-3 text-center font-semibold text-white shadow-lg shadow-brand/20"
              >
                Report an Issue
              </Link>
              <Link
                to="/dashboard"
                className="rounded-lg bg-surface px-6 py-3 text-center font-semibold hover:bg-surface-hover"
              >
                View Issues
              </Link>
            </div>
          </div>

          {/* 3-Step Civic Resolution Card replacing fake stats */}
          <div className="rounded-2xl border border-border bg-surface/70 p-6 sm:p-8 backdrop-blur shadow-xl">
            <div className="mb-5 flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-light">How SmartEye Works</span>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                3-Step Resolution
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand/20 text-xs font-extrabold text-brand-light">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Snap & Locate</h4>
                  <p className="text-xs text-muted">Take a photo. Our vision AI auto-suggests category and captures verified GPS.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand/20 text-xs font-extrabold text-brand-light">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Direct Dept. Routing</h4>
                  <p className="text-xs text-muted">Tickets route directly to the designated municipal wing (Roads, Waste, Water, Electrical).</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand/20 text-xs font-extrabold text-brand-light">
                  3
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Track to Resolution</h4>
                  <p className="text-xs text-muted">Receive live notifications as city crews inspect, repair, and close the complaint.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-border/60 pt-4 flex items-center justify-between text-xs text-muted">
              <span>7 Municipal Categories</span>
              <span className="text-emerald-400 font-medium">Verified On-Site Triage</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-10 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Why Choose SmartEye?</h2>
          <p className="text-muted">Revolutionizing civic engagement with cutting-edge technology</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border border-border p-8 text-center transition-colors hover:bg-surface"
            >
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-surface">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-bold">{title}</h3>
              <p className="text-sm text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
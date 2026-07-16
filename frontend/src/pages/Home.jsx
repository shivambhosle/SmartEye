import { Link } from 'react-router-dom';
import { Camera, MapPin, Trophy, Shield, LineChart, Smartphone } from 'lucide-react';

const stats = [
  { value: '1,247', label: 'Issues Reported' },
  { value: '89%', label: 'Resolution Rate' },
  { value: '2.3k', label: 'Active Citizens' },
];

const features = [
  { icon: Camera, title: 'AI-Powered Classification', desc: 'Automatically categorize issues using advanced image recognition technology' },
  { icon: MapPin, title: 'Real-time Tracking', desc: 'Track issue status and location updates in real-time with precise GPS' },
  { icon: Trophy, title: 'Gamification', desc: 'Earn points and badges for active civic participation and reporting' },
  { icon: Shield, title: 'Duplicate Detection', desc: 'Smart algorithms prevent duplicate reports and optimize resource allocation' },
  { icon: LineChart, title: 'Analytics Dashboard', desc: 'Comprehensive insights for government authorities to track performance' },
  { icon: Smartphone, title: 'Mobile-First Design', desc: 'Optimized for mobile devices with intuitive user experience' },
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
              Connect citizens with government authorities through AI-powered issue
              classification, real-time tracking, and gamified civic engagement.
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

          {/* Stats — stack full-width on mobile instead of staying pinned right */}
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-1 lg:gap-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-surface p-4 lg:p-6">
                <div className="text-2xl font-extrabold sm:text-3xl">{s.value}</div>
                <div className="mt-1 text-xs text-muted sm:text-sm">{s.label}</div>
              </div>
            ))}
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
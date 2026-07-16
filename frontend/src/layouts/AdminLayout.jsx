import { Outlet, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { Eye, Menu, X } from 'lucide-react';

const links = [
  { to: '/admin/map', label: 'Map View' },
  { to: '/admin/dashboard', label: 'Dashboard' },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `relative py-2 text-sm font-medium ${
      isActive
        ? "text-accent after:absolute after:-bottom-[1px] after:left-0 after:h-[2px] after:w-full after:bg-accent"
        : 'text-foreground/90 hover:text-foreground'
    }`;

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <NavLink to="/admin/dashboard" className="flex items-center gap-2 text-lg font-bold">
            <Eye className="h-6 w-6" />
            SmartEye
          </NavLink>

          <div className="hidden items-center gap-8 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass}>{l.label}</NavLink>
            ))}
          </div>

          <div className="hidden md:flex">
            <span className="rounded-lg bg-surface px-4 py-2 text-sm font-semibold">Admin Panel</span>
          </div>

          <button className="md:hidden" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-border px-4 pb-4 md:hidden">
            <div className="flex flex-col gap-1 pt-2">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-3 text-base font-medium ${isActive ? 'bg-surface text-accent' : 'text-foreground/90'}`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      <Outlet />
    </div>
  );
}
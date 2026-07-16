import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Eye, Menu, X, LogOut } from 'lucide-react';
import { useCitizenAuth } from '../context/CitizenAuthContext.jsx';

const links = [
  { to: '/', label: 'Home' },
  { to: '/report', label: 'Report Issue' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/dashboard', label: 'Dashboard' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useCitizenAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }) =>
    `relative py-2 text-sm font-medium transition-colors ${
      isActive
        ? "text-accent after:absolute after:-bottom-[1px] after:left-0 after:h-[2px] after:w-full after:bg-accent"
        : 'text-foreground/90 hover:text-foreground'
    }`;

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2 text-lg font-bold">
          <Eye className="h-6 w-6" />
          SmartEye
        </NavLink>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass} end={l.to === '/'}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <span className="text-sm text-muted">Hi, {user.name.split(' ')[0]}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 rounded-lg bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-hover"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </>
          ) : (
            <NavLink to="/login" className="rounded-lg bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-hover">
              Login
            </NavLink>
          )}
        </div>

        <button className="md:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
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
                end={l.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) => `rounded-lg px-3 py-3 text-base font-medium ${isActive ? 'bg-surface text-accent' : 'text-foreground/90'}`}
              >
                {l.label}
              </NavLink>
            ))}
            {user ? (
              <button onClick={handleLogout} className="mt-2 flex items-center gap-2 rounded-lg bg-surface px-4 py-3 text-left text-base font-semibold">
                <LogOut className="h-4 w-4" /> Logout ({user.name.split(' ')[0]})
              </button>
            ) : (
              <NavLink to="/login" onClick={() => setOpen(false)} className="mt-2 rounded-lg bg-surface px-4 py-3 text-base font-semibold">
                Login
              </NavLink>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
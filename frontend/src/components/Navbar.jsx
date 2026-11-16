import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Eye, Menu, X, LogOut, Bell, CheckCheck } from 'lucide-react';
import { useCitizenAuth } from '../context/CitizenAuthContext.jsx';
import { citizenApi } from '../lib/api.js';

const links = [
  { to: '/', label: 'Home' },
  { to: '/report', label: 'Report Issue' },
  { to: '/dashboard', label: 'Dashboard' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const { user, logout } = useCitizenAuth();
  const navigate = useNavigate();
  const notifRef = useRef(null);

  const linkClass = ({ isActive }) =>
    `relative py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'text-accent after:absolute after:-bottom-[1px] after:left-0 after:h-[2px] after:w-full after:bg-accent'
        : 'text-foreground/90 hover:text-foreground'
    }`;

  // Close notifications dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications whenever user is logged in
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let isMounted = true;
    async function loadNotifications() {
      try {
        const data = await citizenApi.getNotifications();
        if (isMounted && data) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {
        // Silently handle in case user is guest or token is expired
      }
    }

    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Poll every 30s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  async function handleMarkAllRead() {
    try {
      await citizenApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleNotificationClick(notif) {
    if (!notif.isRead) {
      try {
        await citizenApi.markNotificationRead(notif._id);
        setNotifications((prev) => prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error(err);
      }
    }
    setNotifOpen(false);
    navigate('/dashboard');
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2 text-lg font-bold">
          <Eye className="h-6 w-6 text-brand" />
          SmartEye
        </NavLink>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass} end={l.to === '/'}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-4 md:flex">
          {user ? (
            <>
              {/* Notification Bell Dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen((v) => !v)}
                  className="relative p-2 rounded-lg hover:bg-surface text-foreground transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-status-urgent text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-surface p-4 shadow-xl z-50">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div className="font-semibold text-sm">Notifications</div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="flex items-center gap-1 text-xs text-brand-light hover:underline"
                        >
                          <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-border/50 py-1">
                      {notifications.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted">No notifications yet.</div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n._id}
                            onClick={() => handleNotificationClick(n)}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                              n.isRead ? 'opacity-70 hover:bg-surface-hover/50' : 'bg-brand/5 hover:bg-brand/10'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-xs text-foreground">{n.title}</span>
                              {n.status && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                    n.status === 'resolved'
                                      ? 'bg-status-resolved/20 text-status-resolved'
                                      : n.status === 'in-progress'
                                      ? 'bg-brand/20 text-brand-light'
                                      : 'bg-status-open/20 text-status-open'
                                  }`}
                                >
                                  {n.status}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-muted line-clamp-2">{n.message}</p>
                            <span className="mt-1.5 block text-[10px] text-muted">
                              {new Date(n.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <span className="text-sm text-muted">Hi, {user.name.split(' ')[0]}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 rounded-lg bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-hover"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </>
          ) : (
            <NavLink
              to="/login"
              className="rounded-lg bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-hover"
            >
              Login
            </NavLink>
          )}
        </div>

        <button
          className="md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
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
                className={({ isActive }) =>
                  `rounded-lg px-3 py-3 text-base font-medium ${
                    isActive ? 'bg-surface text-accent' : 'text-foreground/90'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            {user ? (
              <button
                onClick={handleLogout}
                className="mt-2 flex items-center gap-2 rounded-lg bg-surface px-4 py-3 text-left text-base font-semibold"
              >
                <LogOut className="h-4 w-4" /> Logout ({user.name.split(' ')[0]})
              </button>
            ) : (
              <NavLink
                to="/login"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-lg bg-surface px-4 py-3 text-base font-semibold"
              >
                Login
              </NavLink>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
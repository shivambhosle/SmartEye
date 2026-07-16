import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { useStaffAuth } from '../context/StaffAuthContext.jsx';

export default function AdminLogin() {
  const { login } = useStaffAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md rounded-xl border border-border p-8">
        <div className="mb-6 flex items-center justify-center gap-2 text-xl font-bold">
          <Eye className="h-6 w-6" /> SmartEye <span className="text-sm font-normal text-muted">Government</span>
        </div>
        <h2 className="mb-6 text-center text-2xl font-bold">Staff Login</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm"
            />
          </div>

          {error && <p className="text-sm text-status-urgent">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-gradient-to-r from-brand to-brand-dark py-3 font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Government staff without an account? <Link to="/admin/signup" className="text-brand-light">Sign Up</Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted">
          <Link to="/login" className="text-brand-light">Citizen login instead</Link>
        </p>
      </div>
    </div>
  );
}
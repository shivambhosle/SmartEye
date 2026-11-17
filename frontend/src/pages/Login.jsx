import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { useCitizenAuth } from '../context/CitizenAuthContext.jsx';

export default function Login() {
  const { login } = useCitizenAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [unverifiedInfo, setUnverifiedInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setUnverifiedInfo(null);
    setSubmitting(true);
    try {
      await login(email, password);
      // Citizen login always goes to the citizen dashboard — this session
      // has nothing to do with staff access, even if this account also
      // happens to have an admin/officer role in the database.
      navigate('/dashboard');
    } catch (err) {
      if (err.data?.requiresVerification) {
        setUnverifiedInfo({
          email: err.data.email || email,
          debugOtp: err.data.debugOtp || '',
        });
        setError('Please verify your email address to continue.');
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border p-8">
        <div className="mb-6 flex items-center justify-center gap-2 text-xl font-bold">
          <Eye className="h-6 w-6" /> SmartEye
        </div>
        <h2 className="mb-6 text-center text-2xl font-bold">Login</h2>

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

          {error && (
            <div className="rounded-lg bg-status-urgent/10 border border-status-urgent/20 p-3 text-sm text-status-urgent space-y-2">
              <p>{error}</p>
              {unverifiedInfo && (
                <div className="pt-1 border-t border-status-urgent/20 flex flex-col gap-1 text-xs">
                  {unverifiedInfo.debugOtp && (
                    <span className="text-brand-light font-mono">
                      Verification code detected: <strong>{unverifiedInfo.debugOtp}</strong>
                    </span>
                  )}
                  <Link
                    to={`/signup?verifyEmail=${encodeURIComponent(unverifiedInfo.email)}&otp=${encodeURIComponent(unverifiedInfo.debugOtp)}`}
                    className="font-semibold text-brand-light hover:underline inline-flex items-center gap-1"
                  >
                    Click here to enter code & activate account →
                  </Link>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-gradient-to-r from-brand to-brand-dark py-3 font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Don't have an account? <Link to="/signup" className="text-brand-light">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
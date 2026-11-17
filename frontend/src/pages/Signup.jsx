import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, ShieldCheck, RefreshCw } from 'lucide-react';
import { useCitizenAuth } from '../context/CitizenAuthContext.jsx';
import { citizenApi } from '../lib/api.js';

export default function Signup() {
  const { register, verifyOtp } = useCitizenAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState('signup'); // 'signup' | 'verify'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const verifyEmail = searchParams.get('verifyEmail');
    if (verifyEmail) {
      setEmail(verifyEmail);
      setStep('verify');
      setInfo(`Please check your inbox (${verifyEmail}) for the 6-digit verification code.`);
    }
  }, [searchParams]);

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      const res = await register(name, email, password);
      if (res && res.requiresVerification) {
        setStep('verify');
        setInfo('We sent a 6-digit verification code to your email inbox. Please check your inbox (and spam folder).');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await verifyOtp(email, otp);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendOtp() {
    setError('');
    setResending(true);
    try {
      const res = await citizenApi.resendOtp({ email });
      setInfo(res?.message || 'A new verification code has been dispatched to your email.');
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border p-8 bg-surface/50 backdrop-blur">
        <div className="mb-6 flex items-center justify-center gap-2 text-xl font-bold">
          <Eye className="h-6 w-6 text-brand" /> SmartEye
        </div>

        {step === 'signup' ? (
          <>
            <h2 className="mb-2 text-center text-2xl font-bold">Create Account</h2>
            <p className="mb-6 text-center text-sm text-muted">Join SmartEye to report & track civic issues in your area.</p>

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm focus:outline-none focus:border-brand"
                />
                <span className="text-xs text-muted mt-1 block">Disposable email domains will be rejected.</span>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm focus:outline-none focus:border-brand"
                />
              </div>

              {error && <p className="text-sm text-status-urgent">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-gradient-to-r from-brand to-brand-dark py-3 font-semibold text-white shadow-lg hover:opacity-95 disabled:opacity-60 transition-opacity"
              >
                {submitting ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted">
              Already have an account? <Link to="/login" className="text-brand-light font-semibold hover:underline">Login</Link>
            </p>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/20 text-brand">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold">Verify Your Email</h2>
              <p className="mt-1 text-sm text-muted">
                Sent 6-digit verification code to <span className="text-foreground font-medium">{email}</span>
              </p>
            </div>

            {info && (
              <div className="mb-4 rounded-lg bg-brand/10 border border-brand/20 p-3 text-sm text-brand-light text-center">
                {info}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-center">6-Digit Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center text-2xl tracking-[0.3em] font-mono rounded-lg border border-border bg-surface px-4 py-3 focus:outline-none focus:border-brand"
                />
              </div>

              {error && <p className="text-sm text-status-urgent text-center">{error}</p>}

              <button
                type="submit"
                disabled={submitting || otp.length < 6}
                className="w-full rounded-lg bg-gradient-to-r from-brand to-brand-dark py-3 font-semibold text-white shadow-lg hover:opacity-95 disabled:opacity-60 transition-opacity"
              >
                {submitting ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between text-xs text-muted">
              <button
                type="button"
                onClick={() => setStep('signup')}
                className="hover:text-foreground"
              >
                ← Back to signup
              </button>

              <button
                type="button"
                disabled={resending}
                onClick={handleResendOtp}
                className="flex items-center gap-1 text-brand-light hover:underline disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${resending ? 'animate-spin' : ''}`} />
                {resending ? 'Sending...' : 'Resend Code'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { useCitizenAuth } from '../context/CitizenAuthContext.jsx';

export default function Signup() {
  const { register } = useCitizenAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
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
        <h2 className="mb-6 text-center text-2xl font-bold">Create Account</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm"
            />
          </div>
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
              minLength={6}
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
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account? <Link to="/login" className="text-brand-light">Login</Link>
        </p>
      </div>
    </div>
  );
}
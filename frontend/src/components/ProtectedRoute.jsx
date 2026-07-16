import { Navigate, Outlet } from 'react-router-dom';
import { useCitizenAuth } from '../context/CitizenAuthContext.jsx';

export default function ProtectedRoute() {
  const { user, loading } = useCitizenAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
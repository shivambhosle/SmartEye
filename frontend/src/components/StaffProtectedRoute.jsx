import { Navigate, Outlet } from 'react-router-dom';
import { useStaffAuth } from '../context/StaffAuthContext.jsx';

export default function StaffProtectedRoute() {
  const { user, loading } = useStaffAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== 'admin' && user.role !== 'officer') return <Navigate to="/admin/login" replace />;

  return <Outlet />;
}
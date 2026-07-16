import { Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import StaffProtectedRoute from './components/StaffProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Report from './pages/Report.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminSignup from './pages/AdminSignup.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminMap from './pages/AdminMap.jsx';

function CitizenShell() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Outlet />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public citizen pages */}
      <Route element={<CitizenShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/report" element={<Report />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
      </Route>

      {/* Government staff auth — standalone, no citizen Navbar */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/signup" element={<AdminSignup />} />

      {/* Staff-session-only pages */}
      <Route element={<StaffProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="map" element={<AdminMap />} />
        </Route>
      </Route>
    </Routes>
  );
}
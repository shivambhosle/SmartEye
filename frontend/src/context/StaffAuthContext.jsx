import { createContext, useContext, useState, useEffect } from 'react';
import { staffApi } from '../lib/api.js';

const StaffAuthContext = createContext(null);

const TOKEN_KEY = 'smarteye_staff_token';
const USER_KEY = 'smarteye_staff_user';

export function StaffAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedUser) setUser(JSON.parse(storedUser));
    setLoading(false);
  }, []);

  async function login(email, password) {
    const data = await staffApi.login({ email, password });

    if (data.user.role !== 'admin' && data.user.role !== 'officer') {
      throw new Error('This login is for government staff accounts only.');
    }

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function register(name, email, password) {
    await staffApi.register({ name, email, password, role: 'officer' });
    return login(email, password);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  return (
    <StaffAuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  const ctx = useContext(StaffAuthContext);
  if (!ctx) throw new Error('useStaffAuth must be used within a StaffAuthProvider');
  return ctx;
}
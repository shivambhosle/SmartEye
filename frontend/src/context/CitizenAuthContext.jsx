import { createContext, useContext, useState, useEffect } from 'react';
import { citizenApi } from '../lib/api.js';

const CitizenAuthContext = createContext(null);

const TOKEN_KEY = 'smarteye_citizen_token';
const USER_KEY = 'smarteye_citizen_user';

export function CitizenAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedUser) setUser(JSON.parse(storedUser));
    setLoading(false);
  }, []);

  async function login(email, password) {
    const data = await citizenApi.login({ email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function register(name, email, password) {
    return citizenApi.register({ name, email, password, role: 'citizen' });
  }

  async function verifyOtp(email, otp) {
    const data = await citizenApi.verifyOtp({ email, otp });
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  return (
    <CitizenAuthContext.Provider value={{ user, loading, login, register, verifyOtp, logout }}>
      {children}
    </CitizenAuthContext.Provider>
  );
}

export function useCitizenAuth() {
  const ctx = useContext(CitizenAuthContext);
  if (!ctx) throw new Error('useCitizenAuth must be used within a CitizenAuthProvider');
  return ctx;
}
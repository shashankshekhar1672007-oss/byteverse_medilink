import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth as authApi, clearTokens } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

export const PAGES = {
  DASHBOARD: 'dashboard', DOCTORS: 'doctors', CONSULTATION: 'consultation',
  PRESCRIPTION: 'prescription', PRESCRIPTION_LIST: 'prescription_list',
  CONSULTATION_LIST: 'consultation_list',
  RECORDS: 'records', ORDERS: 'orders', SOS: 'sos', PROFILE: 'profile',
  DOCTOR_DASHBOARD: 'doctor_dashboard', CREATE_PRESCRIPTION: 'create_prescription',
  DOCTOR_PRESCRIPTIONS: 'doctor_prescriptions',
};

const Ctx = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser]                             = useState(null);
  const [profile, setProfile]                       = useState(null);
  const [isAuthenticated, setIsAuthenticated]       = useState(false);
  const [loading, setLoading]                       = useState(true);
  const [activePage, setActivePage]                 = useState(null);
  const [pageParams, setPageParams]                 = useState({});
  const [selectedDoctor, setSelectedDoctor]         = useState(null);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState(null);
  const [selectedConsultationId, setSelectedConsultationId] = useState(null);
  const [notifications, setNotifications]           = useState(0);
  const [toast, setToast]                           = useState(null);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      if (!authApi.isLoggedIn()) { setLoading(false); return; }
      try {
        const saved = authApi.getSavedUser();
        if (saved) {
          setUser(saved); setIsAuthenticated(true);
          setActivePage(saved.role === 'doctor' ? PAGES.DOCTOR_DASHBOARD : PAGES.DASHBOARD);
          // Connect socket immediately with saved token
          const token = localStorage.getItem('ml_token');
          if (token) connectSocket(token);
        }
        const res = await authApi.getMe();
        setUser(res.data.user); setProfile(res.data.profile);
        localStorage.setItem('ml_user', JSON.stringify(res.data.user));
        setIsAuthenticated(true);
        setActivePage(res.data.user.role === 'doctor' ? PAGES.DOCTOR_DASHBOARD : PAGES.DASHBOARD);
      } catch { setIsAuthenticated(false); setUser(null); clearTokens(); }
      finally { setLoading(false); }
    })();
    return () => disconnectSocket();
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type }); setTimeout(() => setToast(null), 3500);
  }, []);

  const syncSession = useCallback((nextUser, nextProfile) => {
    if (nextUser) {
      setUser(nextUser);
      localStorage.setItem('ml_user', JSON.stringify(nextUser));
    }
    if (nextProfile !== undefined) {
      setProfile(nextProfile);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    // Connect socket right after login
    const token = localStorage.getItem('ml_token');
    connectSocket(token);
    setUser(data.user); setIsAuthenticated(true);
    setActivePage(data.user.role === 'doctor' ? PAGES.DOCTOR_DASHBOARD : PAGES.DASHBOARD);
    showToast(`Welcome back, ${data.user.name.split(' ')[0]}!`);
    return data;
  }, [showToast]);

  const logout = useCallback(async () => {
    disconnectSocket();
    await authApi.logout();
    setUser(null); setProfile(null); setIsAuthenticated(false);
    setActivePage(null); setSelectedDoctor(null);
    showToast('Logged out successfully');
  }, [showToast]);

  const navigate = useCallback((page, params = {}) => {
    setActivePage(page); setPageParams(params);
    if (params.doctor !== undefined) setSelectedDoctor(params.doctor);
    if (params.prescriptionId !== undefined) setSelectedPrescriptionId(params.prescriptionId);
    if (params.consultationId !== undefined) setSelectedConsultationId(params.consultationId);
  }, []);

  return (
    <Ctx.Provider value={{
      user, profile, isAuthenticated, loading, activePage, pageParams,
      selectedDoctor, selectedPrescriptionId, selectedConsultationId, notifications, toast,
      login, logout, navigate, showToast, syncSession, setNotifications,
      setSelectedDoctor, setSelectedPrescriptionId, setSelectedConsultationId,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp must be used inside AppProvider');
  return c;
};

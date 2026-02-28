
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginView from '@/modules/tms/components/LoginView';
import AppShell from '@/modules/tms/components/AppShell';
import AdminPanel from '@/modules/tms/components/AdminPanel';
import AdminModeSelection from '@/modules/tms/components/AdminModeSelection';
import KioskMode from '@/modules/tms/components/KioskMode';
import { ToastProvider } from '@/shared/contexts/ToastContext';
import { AuthProvider, useAuth } from '@/core/auth/AuthContext';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';
import { useNotifications } from '@/modules/tms/hooks/useNotifications';
import { initFCM } from '@/modules/tms/services/notification';

function AppRoutes() {
  const { user, appMode, login, logout, setAppMode } = useAuth();
  useNotifications(user);

  if (!user) {
    return (
      <>
        <LoginView onLoginSuccess={login} />
      </>
    );
  }

  return (
    <>
      <Routes>
        <Route 
          path="/selection" 
          element={
            appMode === 'selection' && user.role === 'Admin' 
              ? <AdminModeSelection onSelectMode={setAppMode} onLogout={logout} />
              : <Navigate to="/" replace />
          } 
        />
        <Route 
          path="/admin" 
          element={
            appMode === 'admin' && user.role === 'Admin'
              ? <AdminPanel user={user} onLogout={logout} onBackToApp={() => setAppMode('app')} />
              : <Navigate to="/" replace />
          } 
        />
        <Route 
          path="/kiosk" 
          element={
            appMode === 'kiosk' && (user.role === 'Admin' || user.role === 'Kiosk')
              ? <KioskMode onExit={() => user.role === 'Kiosk' ? logout() : setAppMode('selection')} />
              : <Navigate to="/" replace />
          } 
        />
        <Route 
          path="/" 
          element={
            appMode === 'app'
              ? <AppShell user={user} onLogout={logout} onInitNotifications={() => initFCM(user.employee_id)} />
              : <Navigate to={`/${appMode}`} replace />
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function WebApp() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default WebApp;

'use client';

import { useStore } from '@/app/hooks/useStore';
import { LoginScreen } from '@/app/components/screens/LoginScreen';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { Toast } from '@/app/components/ui/Toast';

export default function App() {
  const { user, login, logout, toast, showToast, unreadCount, refreshUnreadCount } = useStore();

  if (!user) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <>
      <MainLayout
        user={user}
        onLogout={logout}
        showToast={showToast}
        unreadCount={unreadCount}
        refreshUnreadCount={refreshUnreadCount}
      />
      <Toast message={toast.message} type={toast.type} show={toast.show} />
    </>
  );
}
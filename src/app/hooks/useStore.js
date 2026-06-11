'use client';

import { useState } from 'react';
import { api, ApiError } from '@/app/api/client';

export const useStore = () => {
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = async () => {
    try {
      const { count } = await api.notifications.unreadCount();
      setUnreadCount(count);
    } catch {}
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const ROLE_TO_TYPE = { ADMIN: 'Admin', INSTRUCTOR: 'Instrutor', STUDENT: 'Aluno' };

  const login = async (email, password) => {
    try {
      const response = await api.login(email, password);
      if (response?.token) {
        localStorage.setItem('authToken', response.token);
        const u = response.user;
        setUser({ ...u, type: ROLE_TO_TYPE[u.role] ?? u.role });
        refreshUnreadCount();
        showToast('Login realizado com sucesso!', 'success');
        return true;
      }
      showToast('Usuário ou senha inválidos.', 'error');
      return false;
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Erro ao fazer login.', 'error');
      return false;
    }
  };

  const logout = async () => {
    try { await api.logout(); } catch {}
    finally {
      localStorage.removeItem('authToken');
      setUser(null);
      setUnreadCount(0);
    }
  };

  return { user, toast, unreadCount, login, logout, showToast, refreshUnreadCount };
};

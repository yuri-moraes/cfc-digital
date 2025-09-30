'use client';

import { useState } from 'react';
import { MOCKED_USERS } from '@/app/data/mockData';

export const useStore = () => {
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const login = (email) => {
    const userData = MOCKED_USERS[email];
    if (userData) {
      setUser(userData);
      showToast('Login realizado com sucesso!', 'success');
      return true;
    }
    showToast('Usuário ou senha inválidos.', 'error');
    return false;
  };

  const logout = () => setUser(null);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };
  
  return { user, login, logout, toast, showToast };
};
'use client';

import { useState } from 'react';
import { api, ApiError } from '@/app/api/client';

export const useStore = () => {
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [classes, setClasses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
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
      if (response && response.token) {
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
      showToast(
        error instanceof ApiError ? error.message : 'Erro ao fazer login.',
        'error'
      );
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      localStorage.removeItem('authToken');
      setUser(null);
      setClasses([]);
      setSchedules([]);
      setEnrollments([]);
      setUnreadCount(0);
    }
  };

  const loadClasses = async () => {
    try {
      const data = await api.getClasses();
      setClasses(Array.isArray(data) ? data : data?.classes || []);
    } catch (error) {
      showToast(
        error instanceof ApiError ? error.message : 'Erro ao carregar aulas.',
        'error'
      );
    }
  };

  const loadEnrollments = async (studentId) => {
    try {
      const data = await api.getEnrollments({ studentId });
      setEnrollments(Array.isArray(data) ? data : data?.enrollments || []);
    } catch (error) {
      showToast(
        error instanceof ApiError ? error.message : 'Erro ao carregar inscrições.',
        'error'
      );
    }
  };

  const loadSchedules = async (params) => {
    try {
      const data = await api.getSchedules(params);
      setSchedules(Array.isArray(data) ? data : data?.schedules || []);
    } catch (error) {
      showToast(
        error instanceof ApiError ? error.message : 'Erro ao carregar horários.',
        'error'
      );
    }
  };

  const enrollClass = async (classId) => {
    try {
      if (!user?.id) {
        showToast('Usuário não autenticado.', 'error');
        return false;
      }
      await api.createEnrollment({ studentId: user.id, classId });
      showToast('Inscrição realizada com sucesso!', 'success');
      await loadEnrollments(user.id);
      return true;
    } catch (error) {
      showToast(
        error instanceof ApiError ? error.message : 'Erro ao se inscrever na aula.',
        'error'
      );
      return false;
    }
  };

  const dropEnrollment = async (enrollmentId) => {
    try {
      await api.deleteEnrollment(enrollmentId);
      showToast('Inscrição cancelada com sucesso!', 'success');
      if (user?.id) {
        await loadEnrollments(user.id);
      }
      return true;
    } catch (error) {
      showToast(
        error instanceof ApiError ? error.message : 'Erro ao cancelar inscrição.',
        'error'
      );
      return false;
    }
  };

  return {
    user,
    toast,
    classes,
    schedules,
    enrollments,
    unreadCount,
    login,
    logout,
    showToast,
    refreshUnreadCount,
    loadClasses,
    loadEnrollments,
    loadSchedules,
    enrollClass,
    dropEnrollment,
  };
};
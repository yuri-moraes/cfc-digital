'use client';

import { useState, useEffect } from 'react';
import { Calendar, Users, FileText, LogOut, User, Menu, X, Bell, ClipboardList, GraduationCap, Car } from 'lucide-react';
import { AdminDashboard } from '../screens/admin/AdminDashboard';
import { AdminUserManagement } from '../screens/admin/AdminUserManagement';
import { AdminReports } from '../screens/admin/AdminReports';
import { AdminVehicleManagement } from '../screens/admin/AdminVehicleManagement';
import { StudentScheduleScreen } from '../screens/student/StudentScheduleScreen';
import { StudentProgressScreen } from '../screens/student/StudentProgressScreen';
import { InstructorAgendaScreen } from '../screens/instructor/InstructorAgendaScreen';
import { InstructorTestResultScreen } from '../screens/instructor/InstructorTestResultScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { api } from '@/app/api/client';

const notifTypeColors = {
  class_reminder: { bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700' },
  class_cancelled: { bg: 'bg-red-50', badge: 'bg-red-100 text-red-700' },
  absence_confirmed: { bg: 'bg-green-50', badge: 'bg-green-100 text-green-700' },
};

export const MainLayout = ({ user, onLogout, showToast, unreadCount, refreshUnreadCount }) => {
  const [activeView, setActiveView] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const navItems = {
    Admin: [
      { icon: Users,         label: 'Usuários',   view: 'users'    },
      { icon: Car,           label: 'Veículos',   view: 'vehicles' },
      { icon: FileText,      label: 'Relatórios', view: 'reports'  },
    ],
    Aluno: [
      { icon: Calendar,      label: 'Meu Horário',  view: 'schedule' },
      { icon: ClipboardList, label: 'Meu Histórico', view: 'progress' },
    ],
    Instrutor: [
      { icon: Calendar,      label: 'Agenda',        view: 'agenda' },
      { icon: GraduationCap, label: 'Exame Prático', view: 'exam'   },
    ],
  };

  useEffect(() => {
    if (user?.type === 'Admin') setActiveView('dashboard');
    if (user?.type === 'Aluno') setActiveView('schedule');
    if (user?.type === 'Instrutor') setActiveView('agenda');
  }, [user]);

  const openNotifications = async () => {
    setIsNotificationsOpen(true);
    setNotifLoading(true);
    try {
      const data = await api.notifications.list({});
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    await api.notifications.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    refreshUnreadCount?.();
  };

  const handleMarkRead = async (id) => {
    await api.notifications.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    refreshUnreadCount?.();
  };

  const renderCurrentScreen = () => {
    if (activeView === 'profile') return <ProfileScreen user={user} showToast={showToast} />;

    if (user.type === 'Admin') {
      if (activeView === 'users')    return <AdminUserManagement showToast={showToast} />;
      if (activeView === 'vehicles') return <AdminVehicleManagement showToast={showToast} />;
      if (activeView === 'reports')  return <AdminReports showToast={showToast} />;
      return <AdminDashboard />;
    }
    if (user.type === 'Aluno') {
      if (activeView === 'progress') return <StudentProgressScreen user={user} />;
      return <StudentScheduleScreen user={user} showToast={showToast} refreshUnreadCount={refreshUnreadCount} />;
    }
    if (user.type === 'Instrutor') {
      if (activeView === 'exam') return <InstructorTestResultScreen user={user} showToast={showToast} />;
      return <InstructorAgendaScreen user={user} showToast={showToast} refreshUnreadCount={refreshUnreadCount} />;
    }
    return null;
  };

  const userNav = navItems[user.type] || [];

  const NavLink = ({ item }) => (
    <button
      onClick={() => { setActiveView(item.view); setIsMenuOpen(false); }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left transition-colors ${
        activeView === item.view
          ? 'bg-blue-100 text-blue-700 font-semibold'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <item.icon size={20} />
      <span>{item.label}</span>
    </button>
  );

  const renderBellButton = () => (
    <button
      onClick={openNotifications}
      className="relative flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left text-gray-600 hover:bg-gray-100"
    >
      <Bell size={20} />
      <span>Notificações</span>
      {unreadCount > 0 && (
        <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 p-4 flex-col fixed h-full">
        <div className="text-2xl font-bold text-gray-800 mb-8 px-2">CFC Digital</div>
        <nav className="space-y-2">
          {user.type === 'Admin' && <NavLink item={{ icon: Calendar, label: 'Dashboard', view: 'dashboard' }} />}
          {userNav.map(item => <NavLink key={item.view} item={item} />)}
        </nav>
        <div className="mt-auto absolute bottom-4 w-56">
          <div className="border-t pt-4 space-y-2">
            {renderBellButton()}
            <NavLink item={{ icon: User, label: 'Meu Perfil', view: 'profile' }} />
            <button
              onClick={onLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left text-gray-600 hover:bg-gray-100"
            >
              <LogOut size={20} /> Sair
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-gray-200 p-4 flex lg:hidden justify-between items-center z-30">
          <div className="text-xl font-bold text-gray-800">CFC Digital</div>
          <div className="flex items-center gap-2">
            <button onClick={openNotifications} className="relative p-2">
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button onClick={() => setIsMenuOpen(true)} className="p-2">
              <Menu size={24} />
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 md:p-8">
          {renderCurrentScreen()}
        </main>
      </div>

      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setIsMenuOpen(false)} />
      )}
      <div className={`fixed top-0 left-0 h-full w-64 bg-white z-50 transform transition-transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:hidden`}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-8">
            <span className="text-2xl font-bold text-gray-800">Menu</span>
            <button onClick={() => setIsMenuOpen(false)} className="p-2"><X size={24} /></button>
          </div>
          <nav className="space-y-2">
            {user.type === 'Admin' && <NavLink item={{ icon: Calendar, label: 'Dashboard', view: 'dashboard' }} />}
            {userNav.map(item => <NavLink key={item.view} item={item} />)}
          </nav>
          <div className="mt-8 border-t pt-4 space-y-2">
            {renderBellButton()}
            <NavLink item={{ icon: User, label: 'Meu Perfil', view: 'profile' }} />
            <button
              onClick={onLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left text-gray-600 hover:bg-gray-100"
            >
              <LogOut size={20} /> Sair
            </button>
          </div>
        </div>
      </div>

      {isNotificationsOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setIsNotificationsOpen(false)}>
          <div
            className="absolute right-4 top-16 lg:right-auto lg:left-64 lg:top-auto w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-gray-800">Notificações</span>
              <div className="flex items-center gap-2">
                <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:underline">
                  Marcar todas como lidas
                </button>
                <button onClick={() => setIsNotificationsOpen(false)}>
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
              {notifLoading ? (
                <div className="p-6 text-center text-gray-400 text-sm">Carregando...</div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">Sem notificações</div>
              ) : notifications.map(n => {
                const colors = notifTypeColors[n.type] || { bg: 'bg-gray-50', badge: 'bg-gray-100 text-gray-700' };
                return (
                  <div
                    key={n.id}
                    onClick={() => handleMarkRead(n.id)}
                    className={`px-4 py-3 cursor-pointer hover:opacity-80 ${colors.bg} ${n.is_read ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${colors.badge}`}>{n.type?.replace('_', ' ')}</span>
                        </div>
                        <p className="text-sm text-gray-800">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

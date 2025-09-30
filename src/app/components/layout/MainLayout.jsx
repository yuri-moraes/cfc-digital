'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Users, FileText, LogOut, User, Menu, X } from 'lucide-react';
import { AdminDashboard } from '../screens/admin/AdminDashboard';
import { AdminUserManagement } from '../screens/admin/AdminUserManagement';
import { AdminReports } from '../screens/admin/AdminReports';
import { StudentScheduleScreen } from '../screens/student/StudentScheduleScreen';
import { StudentMyClassesScreen } from '../screens/student/StudentMyClassesScreen';
import { InstructorAgendaScreen } from '../screens/instructor/InstructorAgendaScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

export const MainLayout = ({ user, onLogout, showToast }) => {
  const [activeView, setActiveView] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const navItems = {
    Admin: [
      { icon: Users, label: 'Usuários', view: 'users' },
      { icon: FileText, label: 'Relatórios', view: 'reports' },
    ],
    Aluno: [
      { icon: Calendar, label: 'Agendar', view: 'schedule' },
      { icon: Clock, label: 'Minhas Aulas', view: 'my-classes' },
    ],
    Instrutor: [
      { icon: Calendar, label: 'Agenda', view: 'agenda' },
    ],
  };

  useEffect(() => {
    if(user?.type === 'Admin') setActiveView('dashboard');
    if(user?.type === 'Aluno') setActiveView('schedule');
    if(user?.type === 'Instrutor') setActiveView('agenda');
  }, [user]);

  const CurrentScreen = () => {
    if (activeView === 'profile') {
      return <ProfileScreen user={user} />;
    }

    if (user.type === 'Admin') {
      if (activeView === 'users') return <AdminUserManagement showToast={showToast} />;
      if (activeView === 'reports') return <AdminReports />;
      return <AdminDashboard />;
    }
    if (user.type === 'Aluno') {
      if (activeView === 'my-classes') return <StudentMyClassesScreen showToast={showToast} />;
      return <StudentScheduleScreen showToast={showToast} />;
    }
    if (user.type === 'Instrutor') {
      return <InstructorAgendaScreen />;
    }
    return null;
  };
  
  const userNav = navItems[user.type] || [];
  
  const NavLink = ({ item }) => (
    <button
      onClick={() => {
        setActiveView(item.view);
        setIsMenuOpen(false);
      }}
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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar para Desktop */}
      <aside className="hidden lg:block w-64 bg-white border-r border-gray-200 p-4 flex-col fixed h-full">
        <div className="text-2xl font-bold text-gray-800 mb-8 px-2">CFC Digital</div>
        <nav className="space-y-2">
          {user.type === 'Admin' && <NavLink item={{icon: Calendar, label: 'Dashboard', view: 'dashboard'}} />}
          {userNav.map(item => <NavLink key={item.view} item={item} />)}
        </nav>
        <div className="mt-auto absolute bottom-4 w-56">
          <div className="border-t pt-4 space-y-2">
            <NavLink item={{icon: User, label: 'Meu Perfil', view: 'profile'}}/>
            <button 
              onClick={onLogout} 
              className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left text-gray-600 hover:bg-gray-100"
            >
              <LogOut size={20}/> Sair
            </button>
          </div>
        </div>
      </aside>
      
      {/* Conteúdo Principal */}
      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-gray-200 p-4 flex lg:hidden justify-between items-center z-30">
          <div className="text-xl font-bold text-gray-800">CFC Digital</div>
          <button onClick={() => setIsMenuOpen(true)} className="p-2">
            <Menu size={24}/>
          </button>
        </header>

        <main className="p-4 sm:p-6 md:p-8">
          <CurrentScreen />
        </main>
      </div>
      
      {/* Menu Mobile */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setIsMenuOpen(false)}></div>
      )}
      <div className={`fixed top-0 left-0 h-full w-64 bg-white z-50 transform transition-transform ${
        isMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:hidden`}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-8">
            <span className="text-2xl font-bold text-gray-800">Menu</span>
            <button onClick={() => setIsMenuOpen(false)} className="p-2">
              <X size={24}/>
            </button>
          </div>
          <nav className="space-y-2">
            {user.type === 'Admin' && <NavLink item={{icon: Calendar, label: 'Dashboard', view: 'dashboard'}} />}
            {userNav.map(item => <NavLink key={item.view} item={item} />)}
          </nav>
          <div className="mt-8 border-t pt-4 space-y-2">
            <NavLink item={{icon: User, label: 'Meu Perfil', view: 'profile'}}/>
            <button 
              onClick={onLogout} 
              className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left text-gray-600 hover:bg-gray-100"
            >
              <LogOut size={20}/> Sair
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
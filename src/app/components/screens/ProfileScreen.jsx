'use client';

import { Card } from '@/app/components/ui/Card';
import { MOCKED_USERS } from '@/app/data/mockData';
import { User, Mail, CreditCard, Phone, Calendar, BookOpen } from 'lucide-react';

const ProfileItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-4 py-3">
    <div className="text-gray-500 mt-1">{icon}</div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium text-gray-800">{value}</p>
    </div>
  </div>
);

export const ProfileScreen = ({ user }) => {
  // Encontrar o email correto do usuário
  const getUserEmail = () => {
    const entries = Object.entries(MOCKED_USERS);
    const found = entries.find(([email, data]) => 
      data.name === user.name || data.id === user.id
    );
    return found ? found[0] : null;
  };

  const userEmail = getUserEmail();
  const userDetails = userEmail ? MOCKED_USERS[userEmail] : user;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Meu Perfil</h2>
      <Card>
        <div className="divide-y">
          <ProfileItem 
            icon={<User size={20} />} 
            label="Nome Completo" 
            value={userDetails.name} 
          />
          <ProfileItem 
            icon={<Mail size={20} />} 
            label="Email" 
            value={userEmail || 'N/A'} 
          />
          
          {user.type === 'Aluno' && userDetails.cpf && (
            <>
              <ProfileItem 
                icon={<CreditCard size={20} />} 
                label="CPF" 
                value={userDetails.cpf} 
              />
              <ProfileItem 
                icon={<Phone size={20} />} 
                label="Celular" 
                value={userDetails.phone} 
              />
              <ProfileItem 
                icon={<BookOpen size={20} />} 
                label="Aulas Compradas" 
                value={userDetails.classesBought} 
              />
              <ProfileItem 
                icon={<Calendar size={20} />} 
                label="Vencimento da Pauta" 
                value={new Date(userDetails.licenseDueDate + 'T00:00:00-03:00').toLocaleDateString('pt-BR')} 
              />
            </>
          )}

          {user.type === 'Instrutor' && (
            <ProfileItem 
              icon={<User size={20} />} 
              label="Função" 
              value="Instrutor de Direção" 
            />
          )}

          {user.type === 'Admin' && (
            <ProfileItem 
              icon={<User size={20} />} 
              label="Função" 
              value="Administrador do Sistema" 
            />
          )}
        </div>
      </Card>
    </div>
  );
};
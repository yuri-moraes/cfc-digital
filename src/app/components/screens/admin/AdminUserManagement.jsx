'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Modal } from '@/app/components/ui/Modal';
import { MOCKED_INSTRUCTORS, MOCKED_STUDENTS } from '@/app/data/mockData';

export const AdminUserManagement = ({ showToast }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const handleAddUser = () => {
    showToast("Usuário adicionado (simulado)", "success");
    setIsModalOpen(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gerenciar Usuários</h2>
        <Button onClick={() => setIsModalOpen(true)} variant="primary" className="flex items-center gap-2 w-auto">
          <UserPlus size={18}/> Novo Usuário
        </Button>
      </div>
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-4 text-gray-700">Instrutores</h3>
          <Card className="space-y-4">
            {MOCKED_INSTRUCTORS.map(i => (
              <div key={i.id} className="flex justify-between items-center p-2 rounded hover:bg-gray-50">
                <p>{i.name}</p>
                <a href="#" className="text-blue-600 text-sm font-semibold">Editar</a>
              </div>
            ))}
          </Card>
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-4 text-gray-700">Alunos</h3>
          <Card className="space-y-4">
            {MOCKED_STUDENTS.map(s => (
              <div key={s.id} className="flex justify-between items-center p-2 rounded hover:bg-gray-50">
                <div>
                  <p>{s.name}</p>
                  <p className="text-xs text-gray-500">
                    Instrutor: {MOCKED_INSTRUCTORS.find(i => i.id === s.instructorId)?.name}
                  </p>
                </div>
                <a href="#" className="text-blue-600 text-sm font-semibold">Vincular</a>
              </div>
            ))}
          </Card>
        </div>
      </div>
      <Modal title="Adicionar Novo Usuário" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form className="space-y-4">
          <Input id="new-name" placeholder="Nome Completo" />
          <Input id="new-email" type="email" placeholder="Email" />
          <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Selecione o Perfil</option>
            <option value="Aluno">Aluno</option>
            <option value="Instrutor">Instrutor</option>
          </select>
          <p className="text-xs text-gray-500">Uma senha temporária será enviada por email.</p>
          <div className="flex gap-4 pt-4">
            <Button onClick={() => setIsModalOpen(false)} variant="secondary">Cancelar</Button>
            <Button onClick={handleAddUser} variant="primary">Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


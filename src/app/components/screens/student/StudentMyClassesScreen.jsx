'use client';

import { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { MOCKED_SCHEDULE, MOCKED_INSTRUCTORS } from '@/app/data/mockData';

export const StudentMyClassesScreen = ({ showToast }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classToCancel, setClassToCancel] = useState(null);
  const myClasses = MOCKED_SCHEDULE['instrutor1'].filter(c => c.studentId === 'aluno1');

  const handleCancelClick = (c) => {
    setClassToCancel(c);
    setIsModalOpen(true);
  };

  const confirmCancellation = () => {
    showToast('Aula desmarcada com sucesso.', 'success');
    setIsModalOpen(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Minhas Aulas</h2>
      <div className="space-y-4">
        {myClasses.length > 0 ? myClasses.map((c, index) => (
          <Card key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="font-bold text-gray-800">
                {new Date(`${c.date}T${c.time}`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </p>
              <p className="text-gray-600">às {c.time} com {MOCKED_INSTRUCTORS.find(i => i.id === 'instrutor1').name}</p>
            </div>
            <Button onClick={() => handleCancelClick(c)} variant="danger" className="w-full sm:w-auto">Desmarcar</Button>
          </Card>
        )) : <p className="text-gray-500">Você não tem aulas agendadas.</p>}
      </div>
      <Modal title="Desmarcar Aula" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <p className="text-gray-600 mb-6">
          Tem certeza que deseja desmarcar a aula do dia {classToCancel && new Date(`${classToCancel.date}T00:00:00Z`).toLocaleDateString('pt-BR')} às {classToCancel?.time}?
        </p>
        <div className="flex gap-4">
          <Button onClick={() => setIsModalOpen(false)} variant="secondary">Não, manter</Button>
          <Button onClick={confirmCancellation} variant="danger">Sim, desmarcar</Button>
        </div>
      </Modal>
    </div>
  );
};
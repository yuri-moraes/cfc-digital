'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { Spinner } from '@/app/components/ui/Spinner';
import { MOCKED_USERS, MOCKED_SCHEDULE } from '@/app/data/mockData';

export const StudentScheduleScreen = ({ showToast }) => {
  const [currentDate, setCurrentDate] = useState(new Date('2024-10-28T12:00:00Z'));
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 500);
  }, [currentDate]);

  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
  const studentData = MOCKED_USERS['aluno@cfc.com'];
  const instructorSchedule = MOCKED_SCHEDULE[studentData.instructorId] || [];

  const getSlotStatus = (time) => {
    const dateStr = currentDate.toISOString().split('T')[0];
    const scheduled = instructorSchedule.find(s => s.date === dateStr && s.time === time);
    if (!scheduled) return { status: 'Disponível' };
    if (scheduled.studentId === 'aluno1') return { status: 'Minha Aula Marcada' };
    return { status: 'Ocupado' };
  };

  const handleSlotClick = (time, status) => {
    if (status.status === 'Disponível') {
      setSelectedSlot({ date: currentDate, time });
      setIsModalOpen(true);
    }
  };

  const confirmBooking = () => {
    showToast('Aula agendada com sucesso!', 'success');
    setIsModalOpen(false);
  };

  const changeDay = (amount) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + amount);
      return newDate;
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Agendar Aula</h2>
      <Card>
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => changeDay(-1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <ChevronLeft />
          </button>
          <h3 className="text-lg font-semibold">
            {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </h3>
          <button onClick={() => changeDay(1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <ChevronRight />
          </button>
        </div>
        {isLoading ? <Spinner /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {timeSlots.map(time => {
              const statusInfo = getSlotStatus(time);
              const statusClasses = {
                'Disponível': 'bg-blue-100 text-blue-800 border-blue-200 cursor-pointer hover:bg-blue-200',
                'Ocupado': 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed',
                'Minha Aula Marcada': 'bg-green-100 text-green-800 border-green-200 cursor-default',
              };
              return (
                <div
                  key={time}
                  onClick={() => handleSlotClick(time, statusInfo)}
                  className={`p-4 rounded-lg border text-center transition-colors ${statusClasses[statusInfo.status]}`}
                >
                  <p className="font-bold text-lg">{time}</p>
                  <p className="text-sm">{statusInfo.status}</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <Modal title="Confirmar Agendamento" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <p className="text-gray-600 mb-6">
          Deseja confirmar sua aula para o dia {selectedSlot?.date.toLocaleDateString('pt-BR')} às {selectedSlot?.time}?
        </p>
        <div className="flex gap-4">
          <Button onClick={() => setIsModalOpen(false)} variant="secondary">Cancelar</Button>
          <Button onClick={confirmBooking} variant="primary">Confirmar</Button>
        </div>
      </Modal>
    </div>
  );
};
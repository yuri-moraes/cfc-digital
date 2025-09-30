'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Spinner } from '@/app/components/ui/Spinner';
import { MOCKED_SCHEDULE } from '@/app/data/mockData';

export const InstructorAgendaScreen = () => {
  const [currentDate, setCurrentDate] = useState(new Date('2024-10-28T12:00:00Z'));
  const [isLoading, setIsLoading] = useState(true);

  const instructorId = 'instrutor1';
  const schedule = MOCKED_SCHEDULE[instructorId] || [];

  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 500);
  }, [currentDate]);

  const changeDay = (amount) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + amount);
      return newDate;
    });
  };

  const dailySchedule = schedule
    .filter(s => s.date === currentDate.toISOString().split('T')[0] && s.studentId)
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Minha Agenda</h2>
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
          <div className="space-y-4">
            {dailySchedule.length > 0 ? dailySchedule.map((s, index) => (
              <div key={index} className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <p className="font-bold text-blue-800">{s.time}</p>
                <p className="text-blue-700">Aula com {s.studentName}</p>
              </div>
            )) : <p className="text-gray-500 p-4 text-center">Nenhuma aula agendada para hoje.</p>}
          </div>
        )}
      </Card>
    </div>
  );
};
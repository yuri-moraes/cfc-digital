'use client';

import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { MOCKED_SCHEDULE, MOCKED_INSTRUCTORS } from '@/app/data/mockData';

export const AdminDashboard = () => {
  const today = new Date('2024-10-28T12:00:00Z').toISOString().split('T')[0];
  
  const todaysClasses = useMemo(() => Object.values(MOCKED_SCHEDULE)
    .flat()
    .filter(c => c.date === today && c.studentId), [today]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-full">
            <Calendar className="text-green-600" size={24}/>
          </div>
          <div>
            <p className="text-4xl font-bold text-gray-800">{todaysClasses.length}</p>
            <p className="text-gray-500">Aulas agendadas para hoje</p>
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-lg mb-4">Agenda do Dia</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {todaysClasses.length > 0 ? todaysClasses.map((c, i) => (
              <div key={i} className="text-sm p-2 bg-gray-50 rounded">
                <span className="font-semibold">{c.time}</span> - {c.studentName} com {MOCKED_INSTRUCTORS.find(inst => MOCKED_SCHEDULE[inst.id].includes(c)).name}
              </div>
            )) : <p className="text-gray-500">Nenhuma aula hoje.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
};


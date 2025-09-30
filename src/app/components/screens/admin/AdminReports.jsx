'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/app/components/ui/Card';
import { MOCKED_INSTRUCTORS, MOCKED_SCHEDULE } from '@/app/data/mockData';

export const AdminReports = () => {
  const [selectedInstructor, setSelectedInstructor] = useState(MOCKED_INSTRUCTORS[0].id);
  const [selectedMonth, setSelectedMonth] = useState('10');

  const reportData = useMemo(() => {
    if (!selectedInstructor || !selectedMonth) return 0;
    
    const monthNumber = parseInt(selectedMonth, 10);

    return MOCKED_SCHEDULE[selectedInstructor]
      .filter(c => {
        const classDate = new Date(`${c.date}T12:00:00Z`);
        return classDate.getMonth() + 1 === monthNumber && c.studentId;
      }).length;
  }, [selectedInstructor, selectedMonth]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Relatórios</h2>
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <select 
            value={selectedInstructor} 
            onChange={e => setSelectedInstructor(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MOCKED_INSTRUCTORS.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="10">Outubro 2024</option>
            <option value="11">Novembro 2024</option>
          </select>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg text-center">
          <p className="text-gray-500">Total de aulas realizadas no mês selecionado</p>
          <p className="text-5xl font-bold text-blue-600 mt-2">{reportData}</p>
        </div>
      </Card>
    </div>
  );
};
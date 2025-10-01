'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/app/components/ui/Card';
import { MOCKED_INSTRUCTORS, MOCKED_SCHEDULE } from '@/app/data/mockData';

export const AdminReports = () => {
  const [selectedInstructor, setSelectedInstructor] = useState(MOCKED_INSTRUCTORS[0].id);
  const [selectedMonth, setSelectedMonth] = useState('10');

  const reportData = useMemo(() => {
    if (!selectedInstructor || !selectedMonth) {
      return {
        total: 0,
        classes: [],
        byDate: [],
        byTime: [],
      };
    }

    const monthNumber = parseInt(selectedMonth, 10);
    const classesForInstructor = MOCKED_SCHEDULE[selectedInstructor] || [];

    const classes = classesForInstructor
      .filter((cls) => {
        if (!cls.studentId) return false;
        const classDate = new Date(`${cls.date}T12:00:00Z`);
        return classDate.getMonth() + 1 === monthNumber;
      })
      .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));

    const groupedByDate = classes.reduce((acc, cls) => {
      acc[cls.date] = acc[cls.date] || [];
      acc[cls.date].push(cls.time);
      return acc;
    }, {});

    const groupedByTime = classes.reduce((acc, cls) => {
      acc[cls.time] = (acc[cls.time] || 0) + 1;
      return acc;
    }, {});

    const byDate = Object.entries(groupedByDate)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, times]) => ({
        date,
        times: times.sort((a, b) => a.localeCompare(b)),
      }));

    const byTime = Object.entries(groupedByTime)
      .sort(([timeA], [timeB]) => timeA.localeCompare(timeB))
      .map(([time, count]) => ({ time, count }));

    return {
      total: classes.length,
      classes,
      byDate,
      byTime,
    };
  }, [selectedInstructor, selectedMonth]);

  const formatToLocaleDate = (isoDate) => new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Relatórios</h2>
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <select 
            value={selectedInstructor} 
            onChange={e => setSelectedInstructor(e.target.value)}
            className="w-full px-4 text-black py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MOCKED_INSTRUCTORS.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="10">Outubro 2024</option>
            <option value="11">Novembro 2024</option>
          </select>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg">
          <p className="text-gray-500 text-sm">Total de aulas realizadas no mês selecionado</p>
          <p className="text-4xl font-bold text-blue-600 mt-1">{reportData.total}</p>
          {reportData.total === 0 ? (
            <p className="mt-4 text-gray-500 text-sm">Nenhuma aula registrada para este instrutor no período informado.</p>
          ) : (
            <div className="mt-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Datas e horários</h4>
                <div className="mt-2 space-y-3">
                  {reportData.byDate.map(({ date, times }) => (
                    <div key={date} className="rounded bg-white/70 p-3">
                      <p className="text-sm font-semibold text-gray-700">{formatToLocaleDate(date)}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-600">
                        {times.map((time) => (
                          <span key={`${date}-${time}`} className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700">
                            {time}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Aulas por horário</h4>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {reportData.byTime.map(({ time, count }) => (
                    <div key={time} className="rounded bg-white/70 p-3 text-center">
                      <p className="font-semibold text-gray-700">{time}</p>
                      <p className="text-sm text-gray-500">{count} aula{count > 1 ? 's' : ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Spinner } from '@/app/components/ui/Spinner';
import { api } from '@/app/api/client';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export const AdminReports = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [instructors, setInstructors] = useState([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [reportData, setReportData] = useState({ total: 0, byDate: [], byTime: [] });
  const [loadingInstructors, setLoadingInstructors] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    api.getUsers()
      .then(data => {
        const list = data.filter(u => u.role === 'INSTRUCTOR');
        setInstructors(list);
        if (list.length > 0) setSelectedInstructorId(list[0].id);
      })
      .finally(() => setLoadingInstructors(false));
  }, []);

  useEffect(() => {
    if (!selectedInstructorId) return;
    const compute = async () => {
      setLoadingReport(true);
      try {
        // Backend has no date-range filter on lesson-slots; fetch with high limit and filter client-side
        const slots = await api.lessonSlots.list({ limit: 500 });
        const monthStr = `${currentYear}-${String(selectedMonth).padStart(2, '0')}`;
        const filtered = slots.filter(s =>
          // eslint-disable-next-line eqeqeq
          s.instructor_id == selectedInstructorId &&
          s.status === 'completed' &&
          s.scheduled_date?.startsWith(monthStr)
        );

        const byDate = {};
        const byTime = {};
        filtered.forEach(s => {
          const d = s.scheduled_date;
          const t = s.start_time?.substring(0, 5);
          if (!byDate[d]) byDate[d] = [];
          byDate[d].push(t);
          byTime[t] = (byTime[t] || 0) + 1;
        });

        setReportData({
          total: filtered.length,
          byDate: Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, times]) => ({ date, times: times.sort() })),
          byTime: Object.entries(byTime).sort(([a], [b]) => a.localeCompare(b)).map(([time, count]) => ({ time, count })),
        });
      } finally {
        setLoadingReport(false);
      }
    };
    compute();
  }, [selectedInstructorId, selectedMonth]);

  const formatDate = (iso) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  if (loadingInstructors) return <div className="p-8"><Spinner /></div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Relatórios</h2>
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <select value={selectedInstructorId} onChange={e => setSelectedInstructorId(e.target.value)}
            className="w-full px-4 text-black py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
            className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            {MONTH_NAMES.map((name, i) => <option key={i + 1} value={i + 1}>{name} {currentYear}</option>)}
          </select>
        </div>

        {loadingReport ? <Spinner /> : (
          <div className="bg-blue-50 p-6 rounded-lg">
            <p className="text-gray-500 text-sm">Total de aulas realizadas no mês selecionado</p>
            <p className="text-4xl font-bold text-blue-600 mt-1">{reportData.total}</p>
            {reportData.total === 0 ? (
              <p className="mt-4 text-gray-500 text-sm">Nenhuma aula realizada para este instrutor no período.</p>
            ) : (
              <div className="mt-6 space-y-6">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Datas e horários</h4>
                  <div className="mt-2 space-y-3">
                    {reportData.byDate.map(({ date, times }) => (
                      <div key={date} className="rounded bg-white/70 p-3">
                        <p className="text-sm font-semibold text-gray-700">{formatDate(date)}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {times.map(time => (
                            <span key={`${date}-${time}`} className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700 text-sm">{time}</span>
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
                        <p className="text-sm text-gray-500">{count} aula{count !== 1 ? 's' : ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
